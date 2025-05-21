"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _path = require("path");
var _assert = _interopRequireDefault(require("assert"));
var _nodeOpcua = require("node-opcua");
var _Transformer = _interopRequireDefault(require("../lib/transform/Transformer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Atvise specific types that need special extensions.
 * @type {Map<string, Object>}
 */
const standardTypes = {
  'VariableTypes.ATVISE.HtmlHelp': {
    extension: '.help.html',
    dataType: _nodeOpcua.DataType.ByteString
  },
  'VariableTypes.ATVISE.TranslationTable': {
    extension: '.locs.xml',
    dataType: _nodeOpcua.DataType.XmlElement
  }
};

/**
 * Extensions to use for {@link node-opcua~DataType}s.
 * @type {Map<string, string>}
 */
const extensionForDataType = {
  [_nodeOpcua.DataType.Boolean.key]: '.bool',
  [_nodeOpcua.DataType.SByte.key]: '.sbyte',
  [_nodeOpcua.DataType.Byte.key]: '.byte',
  [_nodeOpcua.DataType.Int16.key]: '.int16',
  [_nodeOpcua.DataType.UInt16.key]: '.uint16',
  [_nodeOpcua.DataType.Int32.key]: '.int32',
  [_nodeOpcua.DataType.UInt32.key]: '.uint32',
  [_nodeOpcua.DataType.Int64.key]: '.int64',
  [_nodeOpcua.DataType.UInt64.key]: '.uint64',
  [_nodeOpcua.DataType.Float.key]: '.float',
  [_nodeOpcua.DataType.Double.key]: '.double',
  [_nodeOpcua.DataType.String.key]: '.string',
  [_nodeOpcua.DataType.DateTime.key]: '.datetime',
  [_nodeOpcua.DataType.Guid.key]: '.guid',
  // [DataType.ByteString.key]: '.bytestring',
  [_nodeOpcua.DataType.XmlElement.key]: '.xml',
  [_nodeOpcua.DataType.NodeId.key]: '.nodeid',
  [_nodeOpcua.DataType.ExpandedNodeId.key]: '.enodeid',
  [_nodeOpcua.DataType.StatusCode.key]: '.status',
  [_nodeOpcua.DataType.QualifiedName.key]: '.name',
  [_nodeOpcua.DataType.LocalizedText.key]: '.text',
  [_nodeOpcua.DataType.ExtensionObject.key]: '.obj',
  [_nodeOpcua.DataType.DataValue.key]: '.value',
  [_nodeOpcua.DataType.Variant.key]: '.variant',
  [_nodeOpcua.DataType.DiagnosticInfo.key]: '.info'
};

/**
 * Extensions to use for {@link node-opcua~VariantArrayType}s.
 * @type {Map<string, string>}
 */
const extensionForArrayType = {
  [_nodeOpcua.VariantArrayType.Array.key]: '.array',
  [_nodeOpcua.VariantArrayType.Matrix.key]: '.matrix'
};

/**
 * A Transformer that maps {@link ReadStream.ReadResult}s to {@link AtviseFile}s.
 */
class MappingTransformer extends _Transformer.default {
  /**
   * Creates a new mapping transformer.
   * @param {Object} [options] The arguments passed to the {@link Transformer} constructor.
   */
  constructor(options = {}) {
    super(options);

    /**
     * Contents of the reference files read but not used yet.
     * @type {Object}
     */
    this._readReferenceFiles = {};
  }

  /**
   * Writes an {@link AtviseFile} for each {@link ReadStream.ReadResult} read. If a read file has a
   * non-standard type (definition) an additional `rc` file is pushed holding this type.
   * @param {Node} node The read result to create the file for.
   * @param {string} encoding The encoding used.
   * @param {function(err: ?Error, data: ?AtviseFile)} callback Called with the error that occurred
   * while transforming the read result or the resulting file.
   */
  transformFromDB(node, encoding, callback) {
    if (!node.fullyMapped && !node.parentResolvesMetadata) {
      // Skip mapping for e.g. split files
      const typeDefinition = node.typeDefinition;
      let isStandardTypeNode = false;

      // Add extensions for standard types
      for (const [def, {
        extension
      }] of Object.entries(standardTypes)) {
        if (node.isVariable && typeDefinition === def) {
          node.renameTo(`${node.name}${extension}`);
          isStandardTypeNode = true;

          // FIXME: Set dataType and mark as resolved
          // FIXME: Set typeDefinition and mark as resolved
        } else if (node.fileName.endsWith(extension)) {
          callback(new Error(`Name conflict: ${node.nodeId} should not end with '${extension}'`));
          return;
        }
      }

      // Add extensions for data types
      for (const [type, ext] of Object.entries(extensionForDataType)) {
        if (node.isVariable && node.value && node.value.dataType.key === type) {
          if (!isStandardTypeNode) {
            node.renameTo(`${node.name}${ext}`);
            break;
          }

          // FIXME: Set dataType and mark as resolved
        }
      }

      // Add extensions for array types
      for (const [type, ext] of Object.entries(extensionForArrayType)) {
        if (node.isVariable && node.value.arrayType.key === type) {
          if (!isStandardTypeNode) {
            node.renameTo(`${node.name}${ext}`);
          }

          // FIXME: Set arrayType and mark as resolved
        } else if (node.fileName.endsWith(ext)) {
          callback(new Error(`Name conflict: ${node.nodeId} should not end with '${ext}'`));
          return;
        }
      }
    }

    // Compact mapping: Root source folders are AGENT, SYSTEM, ObjectTypes and VariableTypes
    // FIXME: Make optional
    const ignore = new Set([58,
    // Objects -> Types -> BaseObjectType
    62,
    // Objects -> Types -> BaseVariableType
    85,
    // Objects
    86 // Objects -> Types
    ]);
    for (let c = node; c && c.parent && !c._compactMappingApplied; c = c.parent) {
      if (ignore.has(c.parent.id.value)) {
        c.parent = c.parent.parent;
        c = node;
      }
    }
    Object.assign(node, {
      _compactMappingApplied: true
    });
    callback(null, node);
  }

  /**
   * Writes an {@link AtviseFile} for each {@link Node} read.
   * @param {Node} node The raw file.
   * @param {string} encoding The encoding used.
   * @param {function(err: ?Error, data: ?AtviseFile)} callback Called with the error that occurred
   * while transforming the read result or the resulting file.
   */
  transformFromFilesystem(node, encoding, callback) {
    let isStandardTypeNode = false;

    // Resolve standard type from extension
    for (const [, {
      extension
    }] of Object.entries(standardTypes)) {
      if (node.name.endsWith(extension)) {
        isStandardTypeNode = true;

        // FIXME: Set dataType and mark as resolved
        // FIXME: Set typeDefinition and mark as resolved

        node.renameTo((0, _path.basename)(node.name, extension));
      }
    }

    // Resolve arrayType from extension
    for (const [type, extension] of Object.entries(extensionForArrayType)) {
      if (node.name.endsWith(extension) && !isStandardTypeNode) {
        _assert.default.equal(node.arrayType.key, type);

        // FIXME: Set arrayType and mark as resolved

        node.renameTo((0, _path.basename)(node.name, extension));
        break;
      }
    }

    // Resolve dataType from extension
    for (const [type, extension] of Object.entries(extensionForDataType)) {
      if (node.name.endsWith(extension) && !isStandardTypeNode && node.dataType.key === type) {
        // FIXME: Set dataType and mark as resolved

        node.renameTo((0, _path.basename)(node.name, extension));
        break;
      }
    }
    return callback(null, node);
  }

  /**
   * `true` as the mapping transformer should infer references from config files.
   */
  get transformsReferenceConfigFiles() {
    return true;
  }
}
exports.default = MappingTransformer;
//# sourceMappingURL=Mapping.js.map