"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _path = require("path");
var _nodeOpcua = require("node-opcua");
/**
 * OPC-UA node id types.
 * @type {Map<String, node-opcua~NodeIdType>}
 */
const Type = _nodeOpcua.NodeId.NodeIdType;

/**
 * OPC-UA node id types mapped against node-id identifiers (e.g. i, s ...).
 * @type {Map<String, node-opcua~NodeIdType>}
 */
const TypeForIdentifier = {
  i: Type.NUMERIC,
  s: Type.STRING,
  g: Type.GUID,
  b: Type.BYTESTRING
};

/**
 * Resource nodes are only allowed to have these child nodes.
 * @type {Set<string>}
 */
const possibleResourceChildNodes = new Set(['Translate', 'Compress']);

/**
 * A wrapper around {@link node-opcua~NodeId}.
 */
class NodeId extends _nodeOpcua.NodeId {
  /**
   * Creates a new NodeId. Can be called in multiple ways:
   *  - with a {@link node-opcua~NodeIdType}, a value and a namespace (defaults to 0),
   *  - with a value only (type will be taken from it, namespace defaults to 1) or
   *  - with a {@link NodeId}s string representation (for example `ns=1;s=AGENT.DISPLAYS`).
   * @param {node-opcua~NodeIdType|string|number} typeOrValue The type or value to use.
   * @param {(number|string)} [value] The value to use.
   * @param {number} [namespace=1] The namespace to use.
   */
  constructor(typeOrValue, value, namespace = 1) {
    if (!(typeOrValue in Type) && typeof typeOrValue !== 'number') {
      let m = null;
      if (typeof typeOrValue === 'string') {
        m = typeOrValue.match(/^ns=([0-9]+);(i|s|g|b)=(.*)$/);
      }
      if (m === null) {
        super(Number.isNaN(Number.parseInt(typeOrValue, 10)) ? Type.STRING : Type.NUMERIC, typeOrValue, 1);
      } else {
        const n = Number.parseInt(m[1], 10);
        const t = TypeForIdentifier[m[2]];
        const v = t === Type.NUMERIC ? Number.parseInt(m[3], 10) : m[3];
        super(t, v, n);
      }
    } else {
      super(typeOrValue, value, namespace);
    }
  }

  /**
   * Creates a new NodeId based on a file path.
   * @param {string} path The file path to use.
   * @return {NodeId} The resulting NodeId.
   */
  static fromFilePath(path) {
    let separator = '.';
    const value = path.split(_path.sep).reduce((result, current, index, components) => {
      const next = `${result ? `${result}${separator}` : ''}${current.replace('%2F', '/')}`;
      if (current === 'RESOURCES') {
        separator = '/';
      } else if (separator === '/' && possibleResourceChildNodes.has(components[index + 1])) {
        separator = '.';
      }
      return next;
    }, '');
    return new NodeId(NodeId.NodeIdType.STRING, value, 1);
  }

  /**
   * The node id's value, encoded to a file path.
   * @type {string}
   */
  get filePath() {
    const parts = this.value.split('RESOURCES');
    parts[0] = parts[0].replace('/', '%2F').split('.').join('/');
    return parts.join('RESOURCES');
  }

  // eslint-disable-next-line jsdoc/require-description-complete-sentence
  /**
   * Returns the last separator in a string node id's path, e.g.:
   * - `'/'` for `ns=1;SYSTEM.LIBRARY.RESOURCES/index.htm`,
   * - `'.'` for `ns=1;AGENT.DISPLAYS.Main`.
   * @type {?string} `null` for non-string node ids, `'/'` for resource paths, `'.'` for regular
   * string node ids.
   */
  get _lastSeparator() {
    if (this.identifierType !== NodeId.NodeIdType.STRING) {
      return null;
    }
    return ~this.value.indexOf('/') ? '/' : '.';
  }

  /**
   * The parent node id, or `null`.
   * @type {?NodeId}
   * @deprecated Doesn't work properly in some edge cases. Use AtviseFile#parentNodeId instead
   * whenever possible.
   */
  get parent() {
    if (this.identifierType !== NodeId.NodeIdType.STRING) {
      return null;
    }

    /*
      Known aliases:
        - AGENT and SYSTEM are children of "Objects"
        - ObjectTypes.PROJECT and VariableTypes.PROJECT are children of their base Types
    */
    // FIXME: Should be in mapping transformer
    if (this.value === 'AGENT' || this.value === 'SYSTEM') {
      return new NodeId(NodeId.NodeIdType.NUMERIC, 85, 0); // "Objects"
    } else if (this.value === 'ObjectTypes.PROJECT') {
      return new NodeId(NodeId.NodeIdType.NUMERIC, 58, 0); // "BaseObjectType"
    } else if (this.value === 'VariableTypes.PROJECT') {
      return new NodeId(NodeId.NodeIdType.NUMERIC, 62, 0); // "BaseVariableType"
    }
    const parentValue = this.value.substr(0, this.value.lastIndexOf(this._lastSeparator));
    if (!parentValue) {
      // Root node -> 'Objects' is parent
      return new NodeId(NodeId.NodeIdType.NUMERIC, 85, 0);
    }
    return new NodeId(NodeId.NodeIdType.STRING, parentValue, this.namespace);
  }

  /**
   * Checks if the node is a child of another.
   * @param {NodeId} parent The possible parent to check.
   * @return {boolean} `true` if *this* is a child node of *parent*.
   */
  isChildOf(parent) {
    if (this.identifierType !== NodeId.NodeIdType.STRING || parent.identifierType !== NodeId.NodeIdType.STRING) {
      return false;
    }
    if (this.namespace !== parent.namespace || this.value === parent.value) {
      return false;
    }
    const [prefix, postfix] = this.value.split(parent.value);
    return prefix === '' && postfix && (postfix[0] === this._lastSeparator || this._lastSeparator === '/' && postfix[0] === '.' && postfix.split('.').length === 2);
  }

  /**
   * The node id's browsename as string.
   * @type {string}
   */
  get browseName() {
    if (this.identifierType !== NodeId.NodeIdType.STRING) {
      return null;
    }
    return this.value.substr(this.value.lastIndexOf(this._lastSeparator) + 1);
  }

  /**
   * Returns a string in the format "namespace value" that is printed when inspecting the NodeId
   * using {@link util~inspect}.
   * @see https://nodejs.org/api/util.html#util_util_inspect_object_options
   * @param {number} depth The depth to inspect.
   * @param {Object} options The options to use.
   * @return {string} A string in the format "namespace value".
   */
  inspect(depth, options) {
    return [options.stylize(this.namespace, 'number'), options.stylize(this.value, this.identifierType === Type.NUMERIC ? 'number' : 'string')].join(' ');
  }
}
exports.default = NodeId;
//# sourceMappingURL=NodeId.js.map