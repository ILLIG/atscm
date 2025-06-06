"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _nodeOpcua = require("node-opcua");
var _gulplog = _interopRequireDefault(require("gulplog"));
var _modifyXml = require("modify-xml");
var _semver = require("semver");
var _ConfigTransformer = _interopRequireDefault(require("../lib/transform/ConfigTransformer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const rootMetaTags = [{
  tag: 'title'
}, {
  tag: 'desc',
  key: 'description'
}];

/**
 * Splits read atvise display XML nodes into their SVG and JavaScript sources,
 * alongside with a .json file containing the display's parameters.
 */
class DisplayTransformer extends _ConfigTransformer.default {
  /**
   * The extension to add to display container node names when they are pulled.
   * @type {string}
   */
  static get extension() {
    return '.display';
  }

  /**
   * The source file extension to allow for scripts.
   */
  static get scriptSourceExtension() {
    return '.js';
  }

  /**
   * The source file extensions to allow.
   * @type {string[]}
   */
  static get sourceExtensions() {
    return ['.json', '.svg', this.scriptSourceExtension];
  }

  /**
   * Returns `true` for all display nodes.
   * @param {Node} node The node to check.
   */
  shouldBeTransformed(node) {
    return node.hasTypeDefinition('VariableTypes.ATVISE.Display');
  }
  normalizeScriptAttributes(attributes) {
    return {
      src: attributes['atv:href'] || attributes['xlink:href'] || attributes.src,
      name: attributes['atv:name'] || undefined,
      mimeType: attributes.type !== 'text/ecmascript' ? attributes.type : undefined
    };
  }

  /**
   * Splits any read files containing atvise displays into their SVG and JavaScript sources,
   * alongside with a json file containing the display's parameters.
   * @param node The node to split.
   * @param context The transform context.
   */
  async transformFromDB(node, context) {
    if (!this.shouldBeTransformed(node)) {
      return undefined;
    }
    const xml = this.decodeContents(node);
    if (!xml) {
      throw new Error('Error parsing display');
    }
    const document = (0, _modifyXml.findChild)(xml, 'svg');
    if (!document) {
      throw new Error('Error parsing display: No `svg` tag');
    }
    const config = {
      scripts: []
    };
    const scriptTags = (0, _modifyXml.removeChildren)(document, 'script');
    let inlineScript;
    rootMetaTags.forEach(({
      tag,
      key
    }) => {
      const [element, ...additional] = (0, _modifyXml.removeChildren)(document, tag);
      if (!element) return;
      config[key || tag] = (0, _modifyXml.textContent)(element);
      if (additional.length) {
        _gulplog.default.warn(`Removed additional <${tag} /> element inside ${node.nodeId}`);
      }
    });

    // Extract JavaScript
    if (scriptTags.length) {
      scriptTags.forEach(script => {
        const attributes = (0, _modifyXml.attributeValues)(script);
        const normalized = this.normalizeScriptAttributes(attributes);
        if (attributes !== null && attributes !== void 0 && attributes['atv:href']) {
          // Linked scripts
          config.scripts.push(_objectSpread({
            type: 'linked'
          }, normalized));
        } else if (attributes !== null && attributes !== void 0 && attributes.src || attributes !== null && attributes !== void 0 && attributes['xlink:href']) {
          // Referenced scripts
          config.scripts.push(_objectSpread({
            type: 'referenced'
          }, normalized));
        } else if (inlineScript) {
          // Warn on multiple inline scripts
          _gulplog.default[node.id.value.startsWith('SYSTEM.LIBRARY.ATVISE') ? 'debug' : 'warn'](`'${node.id.value}' contains multiple inline scripts.`);
          document.childNodes.push(inlineScript);
        } else if ((0, _modifyXml.textContent)(script)) {
          // Inline script
          config.scripts.push(_objectSpread({
            type: 'inline'
          }, normalized));
          inlineScript = script;
        }
      });
    }
    if (inlineScript) {
      const scriptFile = this.constructor.splitFile(node, '.js');
      const scriptText = (0, _modifyXml.textContent)(inlineScript);
      scriptFile.value = {
        dataType: _nodeOpcua.DataType.String,
        arrayType: _nodeOpcua.VariantArrayType.Scalar,
        value: scriptText
      };
      context.addNode(scriptFile);
    }

    // Extract metadata
    const metaTag = (0, _modifyXml.findChild)(document, 'metadata');
    if (metaTag && metaTag.childNodes) {
      // TODO: Warn on multiple metadata tags

      // - Parameters
      const paramTags = (0, _modifyXml.removeChildren)(metaTag, 'atv:parameter');
      if (paramTags.length) {
        config.parameters = [];
        paramTags.forEach(n => config.parameters.push(this.sortedAttributeValues(n)));
      }
    }

    // Remove empty config values
    // - Remove inline script config if it's the only script
    //   FIXME: Add option to disable this
    const [firstScript] = config.scripts;
    if (config.scripts.length === 1 && firstScript.type === 'inline') {
      const hasValues = ~Object.values(_objectSpread(_objectSpread({}, firstScript), {}, {
        type: undefined
      })).findIndex(v => v);
      if (!hasValues) {
        config.scripts.pop();
      }
    }

    // Remove empty scripts array
    if (!config.scripts.length) delete config.scripts;

    // Write files
    this.writeConfigFile(config, node, context);
    const svgFile = this.constructor.splitFile(node, '.svg');
    svgFile.value = {
      dataType: _nodeOpcua.DataType.String,
      arrayType: _nodeOpcua.VariantArrayType.Scalar,
      value: this.encodeContents(xml)
    };
    context.addNode(svgFile);

    // equals: node.renameTo(`${node.name}.display`);
    return super.transformFromDB(node, context);
  }
  scriptTagAttributes(config) {
    return Object.entries(config).reduce((soFar, [key, value]) => {
      let outputKey;
      if (key === 'mimeType') outputKey = 'type';
      if (key === 'src') outputKey = config.type === 'referenced' ? 'xlink:href' : 'atv:href';
      return _objectSpread(_objectSpread({}, soFar), {}, {
        [outputKey || `atv:${key}`]: value
      });
    }, {
      type: 'text/ecmascript'
    });
  }

  /**
   * Creates a display from the collected nodes.
   * @param {BrowsedNode} node The container node.
   * @param {Map<string, BrowsedNode>} sources The collected files, stored against their
   * extension.
   * @param context The current transform context.
   */
  combineNodes(node, sources, context) {
    var _config$scripts$filte, _config$scripts;
    const configFile = sources['.json'];
    let config = {};
    if (configFile) {
      try {
        config = JSON.parse(configFile.stringValue);
      } catch (e) {
        throw new Error(`Error parsing JSON in ${configFile.relative}: ${e.message}`);
      }
    }
    const svgFile = sources['.svg'];
    if (!svgFile) {
      throw new Error(`No display SVG for ${node.nodeId}`);
    }
    const scriptFile = sources[this.constructor.scriptSourceExtension];
    let inlineScript = '';
    if (scriptFile) {
      inlineScript = scriptFile.stringValue;
    }
    const xml = this.decodeContents(svgFile);
    const result = xml;
    const svg = (0, _modifyXml.findChild)(result, 'svg');
    if (!svg) {
      throw new Error('Error parsing display SVG: No `svg` tag');
    }
    if (config.dependencies && config.scripts) {
      throw new Error(`Cannot use both 'dependencies' and 'scripts'`);
    }
    const linkedScriptsSupported = (0, _semver.gte)(context.atserverVersion, '3.5.0');
    const referencedScripts = config.dependencies ? config.dependencies.map(src => ({
      src
    })) : (_config$scripts$filte = (_config$scripts = config.scripts) === null || _config$scripts === void 0 ? void 0 : _config$scripts.filter(s => s.type === 'referenced')) !== null && _config$scripts$filte !== void 0 ? _config$scripts$filte : [];
    const addReferencedScripts = () => referencedScripts.forEach(s => {
      (0, _modifyXml.appendChild)(svg, (0, _modifyXml.createElement)('script', undefined, this.scriptTagAttributes(s)));
    });

    // Insert linked scripts

    if (config.scripts) {
      config.scripts.forEach(s => {
        if (s.type === 'linked') {
          if (!linkedScriptsSupported) {
            // FIXME: Add possibility to ignore this error (and do what? :) )
            throw new Error(`Linked scripts are only supported on atserver 3.5 and later`);
          }
          (0, _modifyXml.appendChild)(svg, (0, _modifyXml.createElement)('script', undefined, this.scriptTagAttributes(s)));
        }
      });
    }

    // Insert dependencies

    // On atserver < 3.5 insert dependencies before the inline script
    if (!linkedScriptsSupported) {
      addReferencedScripts();
    }

    // Insert inline script
    // NOTE: Import order is not preserved on atserver < 3.5
    if (scriptFile) {
      (0, _modifyXml.appendChild)(svg, (0, _modifyXml.createElement)('script', [(0, _modifyXml.createCDataNode)(inlineScript)], {
        type: 'text/ecmascript'
      }));
    }

    // Insert referenced scripts after inline scripts in atserver 3.5+

    if (linkedScriptsSupported) {
      addReferencedScripts();
    }

    // Insert metadata
    // - Parameters
    if (config.parameters && config.parameters.length > 0) {
      let [metaTag] = (0, _modifyXml.removeChildren)(svg, 'metadata');

      // FIXME: Warn on multiple metadata tags

      if (!metaTag) {
        metaTag = (0, _modifyXml.createElement)('metadata');
      }

      // Parameters should come before other atv attributes, e.g. `atv:gridconfig`
      for (let i = config.parameters.length - 1; i >= 0; i--) {
        (0, _modifyXml.prependChild)(metaTag, (0, _modifyXml.createElement)('atv:parameter', undefined, config.parameters[i]));
      }

      // Insert <metadata> as first element in the resulting svg, after <defs>, <desc> and
      // <title> if defined (nothing to do, they are ordered inside #encodeContents)
      (0, _modifyXml.prependChild)(svg, metaTag);
    }

    // - Title and description
    rootMetaTags.reverse().forEach(({
      tag,
      key
    }) => {
      const value = config[key || tag];
      if (value !== undefined) {
        (0, _modifyXml.prependChild)(svg, (0, _modifyXml.createElement)(tag, [(0, _modifyXml.createTextNode)(value)]));
      }
    });

    // eslint-disable-next-line
    node.value.value = this.encodeContents(result);
    return node;
  }
}
exports.default = DisplayTransformer;
//# sourceMappingURL=DisplayTransformer.js.map