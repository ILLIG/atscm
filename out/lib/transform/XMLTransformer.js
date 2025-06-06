"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _os = require("os");
var _modifyXml = require("modify-xml");
var _Transformer = require("./Transformer");
var _SplittingTransformer = _interopRequireDefault(require("./SplittingTransformer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function walk(element, action, filter = _modifyXml.isElement) {
  action(element);
  if (element.childNodes) {
    for (const child of element.childNodes.filter(n => filter(n))) {
      walk(child, action);
    }
  }
}

/**
 * A transformer used to transform XML documents.
 */
class XMLTransformer extends _SplittingTransformer.default {
  /**
   * Creates a new XMLTransformer based on some options.
   * @param {Object} [options] The options to use.
   */
  constructor(_ref = {}) {
    let {
        sortXMLAttributes = false,
        removeBuilderRefs = false
      } = _ref,
      options = _objectWithoutProperties(_ref, ["sortXMLAttributes", "removeBuilderRefs"]);
    super(options);

    /** @protected */
    this.sortXMLAttributes = sortXMLAttributes;

    /** @protected */
    this.removeBuilderRefs = removeBuilderRefs;
    function build(object, buildOptions) {
      const root = object.childNodes.find(n => (0, _modifyXml.isElement)(n));
      if (root) {
        (0, _modifyXml.moveToTop)(root, 'metadata');
        (0, _modifyXml.moveToTop)(root, 'defs');
        (0, _modifyXml.moveToTop)(root, 'desc');
        (0, _modifyXml.moveToTop)(root, 'title');
      }
      if (sortXMLAttributes || removeBuilderRefs) walk(root, e => {
        /* eslint-disable no-param-reassign */
        if (removeBuilderRefs) e.attributes = e.attributes.filter(a => !['atv:refpx', 'atv:refpy'].includes(a.name));
        if (sortXMLAttributes) e.attributes = e.attributes.sort((a, b) => b.name > a.name ? -1 : 1);
        delete e.openTag;
        /* eslint-enable no-param-reassign */
      });
      return (0, _modifyXml.render)(object, {
        indent: ' '.repeat(buildOptions.spaces)
      });
    }

    // eslint-disable-next-line jsdoc/require-param
    /**
     * The builder to use with direction {@link TransformDirection.FromDB}.
     * @type {function(object: Object): string}
     */
    this._fromDBBuilder = object => {
      const xml = build(object, {
        compact: false,
        spaces: 2
      });
      return xml.replace(/\r?\n/g, _os.EOL);
    };

    // eslint-disable-next-line jsdoc/require-param
    /**
     * The builder to use with direction {@link TransformDirection.FromFilesystem}.
     * @type {function(object: Object): string}
     */
    this._fromFilesystemBuilder = object => {
      const xml = build(object, {
        compact: false,
        spaces: 1
      });
      return xml.replace(/\r?\n/g, '\n');
    };
  }

  /**
   * @protected
   * @param {import('modify-xml').Element} node The node to handle.
   */
  sortedAttributeValues(node) {
    if (!this.sortXMLAttributes) return (0, _modifyXml.attributeValues)(node);
    return Object.fromEntries(Object.entries((0, _modifyXml.attributeValues)(node)).sort((a, b) => b > a ? -1 : 1));
  }

  /**
   * Returns the XML builder to use based on the current {@link Transformer#direction}.
   * @type {function(object: Object): string}
   */
  get builder() {
    return this.direction === _Transformer.TransformDirection.FromDB ? this._fromDBBuilder : this._fromFilesystemBuilder;
  }

  /**
   * Parses XML in a node's contents.
   * @param {BrowsedNode} node The node to process.
   */
  decodeContents(node) {
    const rawLines = this.direction === _Transformer.TransformDirection.FromDB ? node.value.value.toString() : node.stringValue;
    try {
      return (0, _modifyXml.parse)(rawLines);
    } catch (error) {
      if (error.line) {
        Object.assign(error, {
          rawLines,
          location: {
            start: {
              line: error.line + 1,
              column: error.column + 1
            }
          }
        });
      }
      throw error;
    }
  }

  /**
   * Builds an XML string from an object.
   * @param {Object} object The object to encode.
   */
  encodeContents(object) {
    return this.builder(object);
  }
}
exports.default = XMLTransformer;
//# sourceMappingURL=XMLTransformer.js.map