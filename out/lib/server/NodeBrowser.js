"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.BrowsedNode = void 0;
var _opcua_node_ids = require("node-opcua/lib/opcua_node_ids.js");
var _browse_service = require("node-opcua/lib/services/browse_service.js");
var _read_service = require("node-opcua/lib/services/read_service");
var _variant = require("node-opcua/lib/datamodel/variant");
var _gulplog = _interopRequireDefault(require("gulplog"));
var _pQueue = _interopRequireDefault(require("p-queue"));
var _ProjectConfig = _interopRequireDefault(require("../../config/ProjectConfig"));
var _NodeId = _interopRequireDefault(require("../model/opcua/NodeId"));
var _Node = require("../model/Node");
var _Session = _interopRequireDefault(require("./Session"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A set of all hierarchical reference types.
 * @type {Set<number>}
 */
const HierachicalReferencesTypeIds = new Set([_Node.ReferenceTypeIds.HasChild, _Node.ReferenceTypeIds.Aggregates, _Node.ReferenceTypeIds.HasComponent, _Node.ReferenceTypeIds.HasOrderedComponent, _Node.ReferenceTypeIds.HasHistoricalConfiguration, _Node.ReferenceTypeIds.HasProperty, _Node.ReferenceTypeIds.HasSubtype, _Node.ReferenceTypeIds.HasEventSource, _Node.ReferenceTypeIds.HasNotifier, _Node.ReferenceTypeIds.Organizes]);

/**
 * A node discovered while browsing the server's database.
 */
class BrowsedNode extends _Node.ServerNode {
  /**
   * Creates a new node.
   * @param {Object} options The options to use.
   * @param {?BrowsedNode} options.parent The parent node.
   * @param {Object} options.reference The reference to pick metadata from.
   */
  constructor({
    parent,
    reference,
    nodeClass,
    name
  }) {
    super({
      parent,
      nodeClass: reference ? reference.nodeClass : nodeClass,
      name: reference ? reference.browseName.name : name
    });
    if (reference) {
      // NOTE: You should always provide reference, this only for #createChild
      this.addReference(_Node.ReferenceTypeIds.toParent, reference.referenceTypeId.value);

      /** The node's id. @type {NodeId} */
      this.id = reference.nodeId;
    }

    /** The node's value
     * @type {node-opcua~Variant} */
    this.value = {};
  }

  /**
   * Add multiple references at once.
   * @param {Object[]} references The references to add.
   */
  addReferences(references) {
    references.forEach(reference => {
      this.addReference(reference.referenceTypeId.value, reference.nodeId.value);
    });
  }

  /**
   * Creates new child node.
   * @param {Object} options The options to use.
   * @see {Node#createChild}
   */
  createChild(options) {
    const node = super.createChild(options);
    node.id = this.id;
    return node;
  }
}

/**
 * Browses the server database.
 */
exports.BrowsedNode = BrowsedNode;
class NodeBrowser {
  /**
   * Creates a new node browser.
   * @param {Object} options The options to use.
   * @param {number} [options.concurrency=250] The maximum of nodes to process in parallel.
   * @param {function(node: BrowsedNode): Promise<any>} options.handleNode A custom node handler.
   * @param {boolean} [options.recursive] If the whole node tree should be processed.
   */
  constructor({
    concurrency = 250,
    ignoreNodes = _ProjectConfig.default.ignoreNodes,
    handleNode,
    recursive = true
  } = {}) {
    /** The queue used to process nodes in parallel
     * @type {p-queue~PQueue} */
    this.queue = new _pQueue.default({
      // autoStart: false,
      concurrency
    });

    /** A map of nodes already handled. Keys are ids, values are `true` if the node was already
     * pushed and `false` otherwise.
     * @type {Map<string, boolean>}
     * */
    this._handled = new Map();
    this._waitingFor = {};

    /** A regular expression matching all ignored nodes. @type {RegExp} */
    this._ignoreNodesRegExp = new RegExp(`^(${ignoreNodes.map(n => n.value).join('|')})`);

    /** If the browser should recurse. @type {boolean} */
    this._recursive = recursive;

    /** If a warning should be printed for attempting to pull sort order nodes
     * @type {boolean} */
    this._printSortOrderWarning = recursive;

    /** The custom node handler. @type {function(node: BrowsedNode): Promise<any>} */
    this._handleNode = handleNode;

    /** The number of pushed (discovered and handled) nodes. @type {number} */
    this._pushed = 0;

    /** A map that maps node ids against their discovered hierarchical parent nodes. Used to detect
     * reference conflicts.
     * @type {Map<string, string>} */
    this.parentNode = new Map();
    this.ensureHandled = new Set();
  }

  /**
   * Reads the given node's value.
   * @param {BrowsedNode} node The node to read.
   */
  _readValue(node) {
    if (!node.isVariable) {
      return null;
    }
    return new Promise((resolve, reject) => {
      this._session.readVariableValue(node.id, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result && result.value);
      });
    }).then(value => {
      if (node.nodeId.endsWith('.SortOrder')) {
        const removed = [];
        const siblings = node.parent.children.map(c => c.idName).filter(n => n !== 'SortOrder');
        const existing = value.value.map(({
          name
        }) => name).filter(name => {
          const exists = siblings.find(c => c === name);
          if (exists) {
            return true;
          }
          removed.push(name);
          return false;
        });

        // We could also add missing references here...

        if (removed.length) {
          // eslint-disable-next-line no-param-reassign
          value.value = existing.map(name => ({
            namespaceIndex: 1,
            name
          }));
          _gulplog.default.warn(`Removed ${removed.length} invalid references from '${node.nodeId}'`);
        }
      }
      if (value) {
        return value;
      }

      // Node is a variable but has no value -> Need to read dataType and arrayType directly.
      return new Promise((resolve, reject) => {
        const toRead = [_read_service.AttributeIds.DataType, _read_service.AttributeIds.ValueRank].map(attributeId => ({
          nodeId: node.id,
          attributeId
        }));
        this._session.read(toRead, (err, _, [{
          value: {
            value: dataType
          }
        }, {
          value: {
            value: valueRank
          }
        }] = []) => {
          if (err) return reject(err);

          // FIXME: valueRank -2 (Any) and -3 (ScalarOrOneDimension) are not handled properly here
          const arrayType = valueRank < 0 ? _variant.VariantArrayType.Scalar : _variant.VariantArrayType.Array;
          return resolve({
            dataType: _variant.DataType[dataType.value],
            arrayType,
            value: null
          });
        });
      });
    });
  }

  // FIXME: Debounce á la https://runkit.com/5c347d277da2ad00125b6bc2/5c50161cbc21520012c42290
  // FIXME: Move to api
  /**
   * Browses the server address space at the given node id.
   * @param {Object} options The options to use.
   */
  _browse({
    nodeId,
    browseDirection = _browse_service.BrowseDirection.Forward,
    resultMask = 63
  }) {
    return new Promise((resolve, reject) => {
      this._session.browse({
        nodeId,
        browseDirection,
        resultMask
      }, (err, data = []) => err ? reject(err) : resolve(data[0].references));
    });
  }

  /**
   * Browses a node.
   * @param {BrowsedNode} node The node to browse.
   */
  _browseNode(node) {
    return this._browse({
      nodeId: node.id
    }).then(allReferences => {
      const children = [];
      const references = [];
      const typeDefinitionReference = allReferences.find(ref => ref.referenceTypeId.value === _Node.ReferenceTypeIds.HasTypeDefinition);
      const isUserGroup = typeDefinitionReference && typeDefinitionReference.nodeId.value === 'ObjectTypes.ATVISE.Group';
      allReferences.forEach(reference => {
        // "Cast" ref.nodeId to NodeId
        Object.setPrototypeOf(reference.nodeId, _NodeId.default.prototype);
        const ignored = this._ignoreNodesRegExp.test(reference.nodeId.value);
        const external = this._isExternalReference(reference.nodeId.value);
        if (HierachicalReferencesTypeIds.has(reference.referenceTypeId.value) && !ignored && !external) {
          if (reference.referenceTypeId.value === _Node.ReferenceTypeIds.HasHistoricalConfiguration || isUserGroup && reference.nodeId.value.split(node.nodeId).length === 1) {
            references.push(reference);
            return;
          }
          if (!_ProjectConfig.default.preserveSortOrderNodes && reference.nodeId.value.endsWith('.SortOrder')) {
            if (this._printSortOrderWarning) {
              _gulplog.default.warn(`Skipped pulling an atvise builder sort order node.
 - Reason: These nodes are not consistent across pulls.
 - You can force pulling them by setting Atviseproject.preserveSortOrderNodes.`);
              this._printSortOrderWarning = false;
            }
            return;
          }
          const [prefix, subPath] = reference.nodeId.value.split(node.id.value);
          if (!subPath || prefix !== '') {
            if (!_ProjectConfig.default.isExternal(reference.nodeId.parent.value)) {
              references.push(reference);
              if (this._handled.get(reference.nodeId.value) === undefined) {
                this.ensureHandled.add(reference.nodeId.value);
              }
              return;
            }
          }
          const earlierParent = this.parentNode.get(reference.nodeId.value);
          if (earlierParent) {
            _gulplog.default.warn(`'${reference.nodeId.value}' was discovered as a child node of both '${earlierParent}' and '${node.id.value}'.
  - Reference type (to the latter): ${_Node.ReferenceTypeNames[reference.referenceTypeId.value]} (${reference.referenceTypeId.value})`);
          }
          if (this._handled.get(reference.nodeId.value) === undefined) {
            this.parentNode.set(reference.nodeId.value, node.id.value);
            children.push(new BrowsedNode({
              parent: node,
              reference
            }));
          } // else node is already handled
        } else if (reference.referenceTypeId.value !== 50) {
          // Added by atvise builder
          // 'HasModelParent' reference set in atvise 3.3.2+
          // Always points to parent node, which atscm already handles
          if (reference.referenceTypeId.value === 334 && reference.nodeId.value === (node.parent && node.parent.id.value)) {
            return;
          }

          // Do not add ignored
          if (!ignored) {
            references.push(reference);
          } else {
            _gulplog.default.debug(`Ignored reference from ${node.id.value} (${_Node.ReferenceTypeNames[reference.referenceTypeId.value]}) to ${reference.nodeId.value}`);
          }
        }
      });

      // eslint-disable-next-line no-param-reassign
      node.children = children;
      node.addReferences(references);
      return {
        children,
        references
      };
    });
  }

  /**
   * Finishes processing a given node: After calling {@link NodeBrowser#_handleNode}, it resolves
   * is's dependencies.
   * @param {BrowsedNode} node The node handled.
   */
  async _push(node) {
    if (this._handled.get(node.id.value)) {
      _gulplog.default.error('Prevented duplicate handling of', node.id.value);
      return;
    }

    // Prevent duplicate pushes while reading value file
    this._handled.set(node.id.value, 'processing');

    // eslint-disable-next-line no-param-reassign
    node.value = (await this._readValue(node)) || node.value;

    // TODO: Remove additional properties (children, ...) for better memory-usage

    const originalId = node.id.value;
    await this._handleNode(node);
    this._pushed += 1;

    // Do not proceed if queue is stopped (because an error occured)
    if (!this._recursive || this.queue.isPaused) {
      // Queue is stopped, not adding...
      return;
    }
    this.queue.addAll(node.children.map(child => () => this._process(child)));
    const idValue = node.id.value;
    this._handled.set(idValue, true);
    this.ensureHandled.delete(originalId);

    // Handle dependencies
    if (this._waitingFor[idValue]) {
      this._waitingFor[idValue].forEach(dep => {
        // eslint-disable-next-line no-param-reassign
        if (--dep.dependencies === 0) {
          // Adding as dependencies are resolved
          this.queue.add(() => this._push(dep)).catch(this._reject);
        }
      });
      delete this._waitingFor[idValue];
    }
  }

  /**
   * Instructs the browser to handle a node that would otherwise be queued behind others (eg: its
   * parent node).
   * @param {BrowsedNode} node The node to add.
   * @return {Promise<?BrowsedNode>} The fully processed node.
   */
  addNode(node) {
    if (this.queue.isPaused) {
      _gulplog.default.debug('Queue is stopped, not adding...');
      return Promise.resolve();
    }
    return this.queue.add(() => this._handleNode(node, {
      transform: false
    })).catch(this._reject);
  }

  /**
   * Returns `true` for node ids that should be treated as external references.
   * @param {string|number} idValue Value of the id to check.
   * @return {boolean} If the id should be treated as external.
   */
  _isExternalReference(idValue) {
    // FIXME: Allow plugins
    return typeof idValue !== 'string' || !this._sourceNodesRegExp.test(idValue);
  }

  /**
   * Returns `true` if a node has dependencies it should be queued behind.
   * @param {BrowsedNode} node The node to check.
   */
  _hasDependencies(node) {
    let dependencyCount = 0;
    for (const references of node.references.values()) {
      for (const reference of references) {
        if (this._handled.get(reference) !== true && !this._isExternalReference(reference) && !this._ignoreNodesRegExp.test(reference)) {
          dependencyCount++;
          this._waitingFor[reference] = (this._waitingFor[reference] || []).concat(node);
        }
      }
    }

    // eslint-disable-next-line no-param-reassign
    node.dependencies = dependencyCount;
    return dependencyCount > 0;
  }

  /**
   * Processes a single node: Requires special error handling.
   * @param {BrowsedNode} node The node to process.
   * @return {Promise<?BrowsedNode>} The fully processed node.
   */
  async _process(node) {
    try {
      if (this._handled.has(node.id.value)) {
        // Already queued
        return undefined;
      }
      this._handled.set(node.id.value, false);
      await this._browseNode(node);
      if (!this._hasDependencies(node)) {
        await this._push(node);
      }
    } catch (err) {
      this._reject(err);
    }
    return node;
  }

  /**
   * Discovers and browses the source nodes.
   * @param {Array<string, NodeId>} nodeIds The source ids.
   * @return {Promise<Node[]>} Resolved once finished.
   */
  _getSourceNodes(nodeIds) {
    const browseUp = ({
      nodeId,
      path = []
    }) => this._browse({
      nodeId,
      browseDirection: _browse_service.BrowseDirection.Inverse
    }).then(references => {
      for (const reference of references) {
        if (HierachicalReferencesTypeIds.has(reference.referenceTypeId.value)) {
          path.unshift(reference.nodeId);
          return reference.nodeId.value === _opcua_node_ids.ObjectIds.RootFolder ? path : browseUp({
            nodeId: reference.nodeId,
            path
          });
        }
      }
      throw new Error(`Unable to find parent node of ${nodeId}`);
    });
    const browseDown = (path, target) => Promise.all(path.map((nodeId, i) => this._browse({
      nodeId
    }).then(references => references.find(ref => ref.nodeId.value === (path[i + 1] ? path[i + 1].value : target.value)))));
    return Promise.all(nodeIds.map(nodeId => browseUp({
      nodeId
    }).then(path => browseDown(path, nodeId)).then(pathDown => pathDown.reduce((parent, reference) => new BrowsedNode({
      parent,
      reference
    }), null))));
  }

  /**
   * Starts the browser of the given nodes.
   * @param {NodeId[]} nodeIds The nodes to browse.
   * @return {Promise<any>} Resolved once all nodes are finished.
   */
  async browse(nodeIds) {
    this._sourceNodesRegExp = new RegExp(`^(${nodeIds.map(({
      value
    }) => `${value.replace(/\./g, '\\.')}`).join('|')})`);
    this._session = await _Session.default.create();

    // Add source nodes
    const nodes = await this._getSourceNodes(nodeIds);
    this.queue.addAll(nodes.map(node => () => this._process(node)));

    // Queue error handling
    let processError = null;
    this._reject = err => {
      if (processError) {
        // Multiple errors occured. In most cases this means, that the server connection was closed
        // after the first error.
        _gulplog.default.debug('Additional error', err);
        return;
      }
      processError = err;
      this.queue.pause();
      this.queue.clear();
    };
    return new Promise((resolve, reject) => {
      this.queue.onIdle().then(async () => {
        await _Session.default.close(this._session);
        if (processError) {
          reject(processError);
          return;
        }
        if (Object.keys(this._waitingFor).length) {
          const unresolved = Object.entries(this._waitingFor).reduce((all, [to, children]) => all.concat(children.map(c => ({
            from: c.id.value,
            to,
            type: _Node.ReferenceTypeNames[Array.from(c.references).find(([, refs]) => refs.has(to))[0]]
          }))), []);
          reject(new Error(`Unable to resolve reference${unresolved.length > 1 ? 's' : ''}:

  ${unresolved.map(({
            from,
            type,
            to
          }) => `${from} → (${type}) → ${to}`).join('\n  ')}
`));
          return;
        }
        if (this.ensureHandled.size) {
          reject(new Error(`Some referenced nodes were not handled,
 - ${Array.from(this.ensureHandled).join('\n - ')}`));
          return;
        }
        if (Array.from(this._handled).find(([, pushed]) => !pushed)) {
          throw new Error('A node was processed, but not pushed');
        }
        resolve();
      });
    });
  }
}
exports.default = NodeBrowser;
//# sourceMappingURL=NodeBrowser.js.map