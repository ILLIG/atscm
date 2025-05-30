"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SourceNode = exports.ServerNode = exports.ReferenceTypeNames = exports.ReferenceTypeIds = void 0;
var _opcua_node_ids = require("node-opcua/lib/opcua_node_ids");
var _nodeclass = require("node-opcua/lib/datamodel/nodeclass");
var _Object = require("../helpers/Object");
var _mapping = require("../helpers/mapping");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * References type ids.
 */
const ReferenceTypeIds = exports.ReferenceTypeIds = _objectSpread(_objectSpread({}, _opcua_node_ids.ReferenceTypeIds), {}, {
  toParent: -1
});

/** A reference type name */

/** A raw (number) reference type */

/** Node references stored in definition files */

/** Node definition stored in definition file */

/**
 * Names for references.
 */
const ReferenceTypeNames = exports.ReferenceTypeNames = (0, _Object.reverse)(ReferenceTypeIds);

/**
 * A map specialized for holding references.
 */
class ReferenceMap extends Map {
  /**
   * Adds a new reference.
   * @param {number} type The reference id.
   * @param {string} nodeId The reference target node's id.
   */
  addReference(type, nodeId) {
    const set = this.get(type);
    if (set) {
      set.add(nodeId);
    } else {
      this.set(type, new Set([nodeId]));
    }
  }

  /**
   * Removes the given reference.
   * @param {number} type The reference id.
   * @param {string} nodeId The reference target node's id.
   */
  deleteReference(type, nodeId) {
    const set = this.get(type);
    if (set) {
      const ref = set.delete(nodeId);
      if (ref) {
        if (set.size === 0) {
          this.delete(type);
        }
        return nodeId;
      }
    }
    throw new Error(`No ${ReferenceTypeNames[type] || type} reference to ${nodeId}`);
  }

  /**
   * Returns the first entry of a specific type.
   * @param type The reference type id to look for.
   * @return The first reference found or undefined.
   */
  getSingle(type) {
    const set = this.get(type);
    return set && Array.from(set)[0];
  }

  /**
   * Returns a plain object of refernces.
   * @return A string describing the reference map.
   */
  toJSON() {
    return [...this].reduce((result, [key, value]) => Object.assign(result, {
      [ReferenceTypeNames[key] || key]: [...value]
    }), {});
  }
}
/**
 * The main model class.
 */
class Node {
  /**
   * Creates a new node.
   * @param {Object} options The options to use.
   * @param {string} options.name The node's name.
   * @param {Node} options.parent The node's parent node.
   * @param {node-opcua~NodeClass} options.nodeClass The node's class.
   */
  constructor({
    name,
    parent,
    nodeClass /* , referenceToParent */
  }) {
    /** The node's name when stored to a file. */
    _defineProperty(this, "fileName", void 0);
    /** The node's name when written to the server. */
    _defineProperty(this, "idName", void 0);
    /** The id stored in the definition file. */
    _defineProperty(this, "specialId", void 0);
    /** The node's parent node. */
    _defineProperty(this, "parent", void 0);
    /** The node's class. */
    _defineProperty(this, "nodeClass", void 0);
    /** A set of resolved properties. */
    _defineProperty(this, "_resolved", new Set());
    /** A set of unresolved properties. */
    _defineProperty(this, "_unresolved", void 0);
    /** The node's references. */
    _defineProperty(this, "references", new ReferenceMap());
    /** The node's unresolved refernces. */
    _defineProperty(this, "_resolvedReferences", new ReferenceMap());
    /** The node's resolved refernces. */
    _defineProperty(this, "_unresolvedReferences", new ReferenceMap());
    /** If the parent node resolves metadata. */
    _defineProperty(this, "_parentResolvesMetadata", false);
    this.fileName = name;
    this.idName = name;
    this.parent = parent;
    this.nodeClass = nodeClass;
    this._unresolved = new Set(['nodeClass',
    // Only for variables
    'dataType', 'arrayType']);
  }

  /**
   * If the parent resolves metadata (for example: split transformer source files).
   */
  get parentResolvesMetadata() {
    return this._parentResolvesMetadata;
  }
  markAsResolved(key) {
    const value = this._unresolved.delete(key);

    // FIXME: Only test if debug / test
    if (value === false) {
      throw new Error(`'${key}' is already resolved`);
    }
    this._resolved.add(key);
  }
  isResolved(key) {
    return this._resolved.has(key);
  }

  /**
   * Adds a new reference.
   * @param {number} type The reference type's id.
   * @param {string} id The reference target node's id.
   */
  addReference(type, id) {
    this.references.addReference(type, id);
    this._unresolvedReferences.addReference(type, id);
  }
  setReferences(type, ids) {
    this.references.set(type, new Set(ids));
    this._unresolvedReferences.set(type, new Set(ids));
  }
  markReferenceAsResolved(name, value) {
    const type = ReferenceTypeIds[name];
    const ref = this._unresolvedReferences.deleteReference(type, value);
    this._resolvedReferences.addReference(type, ref);
  }
  markAllReferencesAsResolved(name) {
    const type = ReferenceTypeIds[name];
    this._unresolvedReferences.delete(type);
  }
  hasUnresolvedReference(name) {
    const type = ReferenceTypeIds[name];
    return this._unresolvedReferences.has(type);
  }

  /**
   * The node's file path, used to compute {@link Node#filePath}.
   */
  get _filePath() {
    if (!this.parent) {
      return [this.fileName];
    }
    return this.parent._filePath.concat(this.fileName);
  }

  /**
   * The node's file path.
   */
  get filePath() {
    if (!this.parent) {
      return [];
    }
    return this.parent._filePath;
  }

  /**
   * The node's id, used to compute {@link Node#nodeId}.
   */
  get _nodeId() {
    if (this.specialId) {
      return {
        id: this.specialId,
        separator: this.specialId.match(/\.RESOURCES\/?/) ? '/' : '.'
      };
    }
    if (!this.parent) {
      return {
        id: this.idName,
        separator: '.'
      };
    }
    const {
      separator,
      id
    } = this.parent._nodeId;
    if (this._parentResolvesMetadata) {
      return {
        separator,
        id
      };
    }
    return {
      separator: this.idName === 'RESOURCES' ? '/' : separator,
      id: `${id}${separator}${this.idName}`
    };
  }

  /**
   * The node's id.
   */
  get nodeId() {
    return this._nodeId.id;
  }

  /**
   * The node's type definition if given.
   */
  get typeDefinition() {
    return this.references.getSingle(ReferenceTypeIds.HasTypeDefinition);
  }

  /**
   * The node's modellingRule if given.
   * @type {?number}
   */
  get modellingRule() {
    return this.references.getSingle(ReferenceTypeIds.HasModellingRule);
  }

  /**
   * Returns `true` if the node has the given type definition.
   * @param typeDefName - The type definition to check.
   * @return If the node has the given type definition.
   */
  hasTypeDefinition(typeDefName) {
    const def = this.typeDefinition;
    return def ? def === typeDefName : false;
  }

  /**
   * `true` at the moment.
   */
  get hasUnresolvedMetadata() {
    return true;
    /* FIXME: Once plugin mapping is implemented
    const value = !this._parentResolvesMetadata && (Boolean(this._unresolved.size) ||
      Boolean(this._unresolvedReferences.size) || this.specialId);
      // FIXME: If debug / test
    if (!value && Object.keys(this.metadata).length > 0) {
      throw new Error(`#hasUnresolvedMetadata did return invalid result ${
        value
      } for ${
        JSON.stringify(Object.assign(this, {parent: undefined, value: undefined }), null, '  ')
      }`);
    } else if (value && Object.keys(this.metadata).length === 0) {
      throw new Error('#metadata did return invalid result');
    }
      return value; */
  }

  /**
   * The metadata to store in the node's definition file.
   * @type {Object}
   */
  get metadata() {
    if (this._parentResolvesMetadata) {
      return {};
    }
    const meta = {};
    if (this.specialId) {
      meta.nodeId = this.specialId;
    }
    if (this.isVariableNode()) {
      meta.dataType = this.value.dataType.key;
      meta.arrayType = this.value.arrayType.key;
    } else {
      meta.nodeClass = this.nodeClass.key;
    }
    meta.references = (0, _mapping.sortReferences)(this.references.toJSON());

    /* FIXME: Once plugin mapping is implemented
    for (const unresolved of this._unresolved) {
      let value = this[unresolved];
        if (unresolved === 'dataType') {
        value = this.value.dataType ? this.value.dataType.key : 'UNKNOWN';
      } else if (unresolved === 'arrayType') {
        value = this.value.arrayType ? this.value.arrayType.key : 'UNKNOWN';
      }
        meta[unresolved] = value;
    }
        if (this._unresolvedReferences.size) {
      meta.references = sortReferences(this._unresolvedReferences.toJSON());
    }
    */

    return meta;
  }

  // Manipulation

  /**
   * Creates a new child node.
   * @param {Object} options The options to use.
   * @param {string} options.extension The extension to append to the node's name.
   */
  createChild({
    extension
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = new this.constructor({
      name: this.idName,
      parent: this,
      nodeClass: this.nodeClass
    });
    node.fileName = `${this.fileName}${extension}`;
    node.references = this.references;
    node._parentResolvesMetadata = true;
    return node;
  }

  // Convenience getters

  /**
   * The node's data type.
   */
  get dataType() {
    if (!this.isVariableNode()) {
      throw new TypeError('Not a variable node');
    }
    return this.value.dataType;
  }

  /**
   * The node's array type.
   */
  get arrayType() {
    if (!this.isVariableNode()) {
      throw new TypeError('Not a variable node');
    }
    return this.value.arrayType;
  }

  /**
   * If the node is a variable.
   * @deprecated Use TypeScript compatible {@link Node#isVariableNode} instead.
   */
  get isVariable() {
    return this.nodeClass === _nodeclass.NodeClass.Variable;
  }
  isVariableNode() {
    return this.isVariable;
  }

  // FIXME: Move to display / script transformers

  /**
   * If the node is an object display.
   */
  get isDisplay() {
    return this.hasTypeDefinition('VariableTypes.ATVISE.Display');
  }

  /**
   * If the node is a serverside script.
   */
  get isScript() {
    return this.hasTypeDefinition('VariableTypes.ATVISE.ScriptCode');
  }

  /**
   * If the node is a quickdynamic.
   */
  get isQuickDynamic() {
    return this.hasTypeDefinition('VariableTypes.ATVISE.QuickDynamic');
  }

  /**
   * If the node is a display script.
   */
  get isDisplayScript() {
    return this.hasTypeDefinition('VariableTypes.ATVISE.DisplayScript');
  }
}

/**
 * A node during a *pull*.
 */
exports.default = Node;
class ServerNode extends Node {
  /**
   * The node's name.
   */
  get name() {
    return this.fileName;
  }

  /**
   * Renames a node.
   * @param name The name to set.
   */
  renameTo(name) {
    this.fileName = name;
  }
}

/**
 * A node during a *push*.
 */
exports.ServerNode = ServerNode;
class SourceNode extends Node {
  /**
   * The node's name.
   */
  get name() {
    return this.idName;
  }

  /**
   * Renames a node.
   * @param name The name to set.
   */
  renameTo(name) {
    this.idName = name;
  }
}
exports.SourceNode = SourceNode;
//# sourceMappingURL=Node.js.map