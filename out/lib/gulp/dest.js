"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WriteStream = void 0;
exports.default = dest;
exports.renameConfigPath = void 0;
var _stream = require("stream");
var _path = require("path");
var _os = require("os");
var _nodeclass = require("node-opcua/lib/datamodel/nodeclass");
var _fsExtra = require("fs-extra");
var _hasha = _interopRequireDefault(require("hasha"));
var _gulplog = _interopRequireDefault(require("gulplog"));
var _ProjectConfig = _interopRequireDefault(require("../../config/ProjectConfig"));
var _coding = require("../coding");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Relative path to the rename file.
 * @type {string}
 */
const renameConfigPath = exports.renameConfigPath = './atscm/rename.json';

/**
 * The default name inserted into the rename file.
 * @type {string}
 */
const renameDefaultName = 'insert node name';

/**
 * Options to pass to *hasha*.
 * @type {Object}
 */
const hashaOptions = {
  algorithm: 'md5'
};

/**
 * If checksums should be used to decide if writes are needed.
 * @type {boolean}
 */
const useChecksums = _ProjectConfig.default.vcs === 'svn';
const escapePathComponent = a => a.replace(/\//g, '%2F');

/**
 * A stream that writes {@link Node}s to the file system.
 */
class WriteStream extends _stream.Writable {
  /**
   * Creates a new WriteStream.
   * @param {Object} options The options to use.
   * @param {string} options.path The path to write to **(required)**.
   * @param {string} options.base The base path to write to (defaults to *path*).
   * @param {boolean} [options.cleanRenameConfig=false] If unused entries should be removed when
   * rename config is written.
   */
  constructor(options) {
    if (!options.path) {
      throw new Error('Missing `path` option');
    }
    super(Object.assign({}, options, {
      objectMode: true,
      highWaterMark: 10000
    }));

    /**
     * If the stream is destroyed.
     * @type {boolean}
     */
    this._isDestroyed = false;

    /**
     * The number of processed nodes.
     * @type {number}
     */
    this._processed = 0;

    /**
     * The number of written nodes.
     * @type {number}
     */
    this._written = 0;

    /**
     * The base to output to.
     * @type {string}
     */
    this._base = options.base || options.path;

    /**
     * The object stored in the *rename file* (usually at './atscm/rename.json')
     */
    this._renameConfig = {};
    this._renamesUsed = {};
    this._cleanRenameConfig = options.cleanRenameConfig || false;

    /**
     * A promise that resolves once the *rename file* is loaded.
     * @type Promise<Object>
     */
    this._loadRenameConfig = (0, _fsExtra.readJson)(renameConfigPath).then(config => this._renameConfig = config).catch(() => _gulplog.default.debug('No rename config file loaded'));

    /**
     * A map of ids used for renaming.
     */
    this._idMap = new Map();

    /**
     * If writes should actually be performed. Set to `false` once id conflicts were discovered.
     */
    this._performWrites = true;

    /**
     * The IDs that are affected by node id conflicts, lowercased.
     * @type {Set<string>}
     */
    this._conflictingIds = new Set();

    /**
     * The number of id conflicts discovered.
     * @type {number}
     */
    this._discoveredIdConflicts = 0;
    if (useChecksums) {
      _gulplog.default.info('Optimizing for SVN diffs');
    }
  }

  /**
   * If the stream is destroyed.
   * @type {boolean}
   */
  get isDestroyed() {
    return this._isDestroyed;
  }

  /**
   * Transverses the node tree to see if any parent node has an id conflict.
   * @param {ServerNode} node The processed node.
   * @return {boolean} `true` if a parent node has an id conflict.
   */
  _parentHasIdConflict(node) {
    let current = node.parent;
    while (current) {
      if (this._conflictingIds.has(current.nodeId.toLowerCase())) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
  async _outputFile(path, content) {
    if (useChecksums) {
      const oldSum = await _hasha.default.fromFile(path, hashaOptions).catch(() => null);
      if (oldSum) {
        if (oldSum === (0, _hasha.default)(content, hashaOptions)) {
          _gulplog.default.debug(`Content did not change at ${path}`);
          return Promise.resolve();
        }
        _gulplog.default.debug(`Content changed at ${path}`);
      } else {
        _gulplog.default.debug(`No checksums for ${path}`);
      }
    }
    return (0, _fsExtra.outputFile)(path, content);
  }

  /**
   * Writes a single node to disk.
   * @param {ServerNode} node The processed node.
   * @return {Promise<boolean>} Resolves once the node has been written, `true` indicates the node
   * has actually been written.
   */
  async _writeNode(node) {
    // TODO: Throw if node.name ends with '.inner'
    const dirPath = node.filePath.map(escapePathComponent);
    const writeOps = [];

    // Rename nodes specified in the rename config
    const rename = this._renameConfig[node.id.value];
    if (rename && rename !== renameDefaultName) {
      this._renamesUsed[node.id.value] = true;
      node.renameTo(rename);
      _gulplog.default.debug(`'${node.nodeId}' was renamed to '${rename}'`);
      Object.assign(node, {
        _renamed: true
      });
    }

    // Resolve invalid ids
    if (!node._renamed && node.nodeId !== node.id.value) {
      _gulplog.default.debug(`Resolved ID conflict: '${node.id.value}' should be renamed to '${node.nodeId}'`);
    }
    Object.assign(node, {
      specialId: node.id.value
    });
    if (node.name.match(/:/)) {
      const before = node.name;
      node.renameTo(node.name.replace(/:/g, '_'));
      _gulplog.default.debug(`Resolved ID conflict: '${before}' was renamed to safe name '${node.name}'`);
    }

    // Detect "duplicate" ids (as file names are case insensitive)
    const pathKey = dirPath.concat(node.fileName).join('/').toLowerCase();
    if (this._idMap.has(pathKey)) {
      if (this._parentHasIdConflict(node)) {
        _gulplog.default.debug(`ID conflict: Skipping '${node.nodeId}'`);
      } else {
        _gulplog.default.error(`ID conflict: '${node.nodeId}' conflicts with '${this._idMap.get(pathKey)}'`);
        this._discoveredIdConflicts++;
        const existingRename = this._renameConfig[node.nodeId];
        if (existingRename) {
          if (existingRename === renameDefaultName) {
            // eslint-disable-next-line max-len
            _gulplog.default.error(` - '${node.nodeId}' is present inside the rename file at './atscm/rename.json', but no name has been inserted yet.`);
          } else {
            // eslint-disable-next-line max-len
            _gulplog.default.error(` - The name for '${node.nodeId}' inside './atscm/rename.json' is not unique.`);
          }
          _gulplog.default.info(" - Edit the node's name and run 'atscm pull' again");
        } else {
          this._renameConfig[node.nodeId] = renameDefaultName;
          _gulplog.default.info(` - '${node.nodeId}' was added to the rename file at './atscm/rename.json'`);
          _gulplog.default.info("Edit it's name and run 'atscm pull' again.");
        }
      }
      this._conflictingIds.add(node.nodeId.toLowerCase());
      this._performWrites = false;
    } else {
      this._idMap.set(pathKey, node.nodeId);
    }

    // Write definition file (if needed)
    if (node.hasUnresolvedMetadata) {
      const name = node.nodeClass === _nodeclass.NodeClass.Variable ? `./.${escapePathComponent(node.fileName)}.json` : `./${escapePathComponent(node.fileName)}/.${node.nodeClass.key}.json`;
      if (this._performWrites) {
        writeOps.push(this._outputFile((0, _path.join)(this._base, dirPath.join('/'), name), JSON.stringify(node.metadata, null, '  ')));
      }
    }

    // Write value
    if (node.nodeClass === _nodeclass.NodeClass.Variable) {
      if (node.value) {
        if (!node.value.noWrite) {
          if (this._performWrites) {
            writeOps.push(this._outputFile((0, _path.join)(this._base, dirPath.join('/'), escapePathComponent(node.fileName)), (0, _coding.encodeVariant)(node.value)));
          }

          // Store child nodes as file.inner/...
          node.renameTo(`${node.name}.inner`);
        }
      } else {
        throw new Error('Missing value');
      }
    }
    return Promise.all(writeOps).then(() => {
      this._processed++;
      this._written += writeOps.length;
    }).then(() => writeOps.length > 0);
  }

  /**
   * Writes a single node to the file system.
   * @param {Node} node The node to write.
   * @param {string} enc The encoding used.
   * @param {function(err: ?Error): void} callback Called once finished.
   */
  _write(node, enc, callback) {
    this._loadRenameConfig.then(() => this._writeNode(node)).then(() => callback()).catch(err => callback(err));
  }
  writeAsync(node) {
    return new Promise((resolve, reject) => {
      this._write(node, null, err => err ? reject(err) : resolve());
    });
  }

  /**
   * Writes multiple nodes in parallel.
   * @param {Node[]} nodes The nodes to write.
   * @param {function(error: ?Error): void} callback Called once all nodes have been written.
   */
  _writev(nodes, callback) {
    if (this.isDestroyed) {
      return;
    }
    this._loadRenameConfig.then(() => Promise.all(nodes.map(({
      chunk
    }) => this._writeNode(chunk)))).then(() => callback()).catch(err => callback(err));
  }

  /**
   * Destroys the stream.
   * @param {?Error} err The error that caused the destroy.
   * @param {function(err: ?Error): void} callback Called once finished.
   */
  _destroy(err, callback) {
    this._isDestroyed = true;
    super._destroy(err, callback);
  }

  /**
   * Writes the updated rename config to disk.
   */
  writeRenamefile() {
    if (this._discoveredIdConflicts) {
      _gulplog.default.error(`Discovered ${this._discoveredIdConflicts} node id conflicts, results are incomplete.
 - Resolve all conflicts inside '${renameConfigPath}' and run 'atscm pull' again`);
      // FIXME: Insert link to node id conflict manual here once 1.0.0 is released.
    }
    let renameConfig = this._renameConfig;
    if (!this._discoveredIdConflicts && this._cleanRenameConfig) {
      renameConfig = Object.keys(this._renamesUsed).sort().reduce((result, key) => Object.assign(result, {
        [key]: this._renameConfig[key]
      }), {});
      const renamesRemoved = Object.keys(this._renameConfig).length - Object.keys(renameConfig).length;
      if (renamesRemoved > 0) {
        _gulplog.default.info(`Removed ${renamesRemoved} unused renames from rename configuration.`);
      }
    }
    return (0, _fsExtra.outputFile)(renameConfigPath, `${JSON.stringify(renameConfig, null, '  ')}${_os.EOL}`);
  }
}

/**
 * Creates a new {@link WriteStream} to write to *path*.
 * @param {string} path The path to write to.
 * @param {Object} [options] The options to use. Passed to {@link WriteStream#constructor}.
 */
exports.WriteStream = WriteStream;
function dest(path, {
  cleanRenameConfig = false
} = {}) {
  return new WriteStream({
    path,
    cleanRenameConfig
  });
}
//# sourceMappingURL=dest.js.map