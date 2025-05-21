"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _nodeOpcua = require("node-opcua");
var _XMLTransformer = _interopRequireDefault(require("./XMLTransformer"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class ConfigTransformer extends _XMLTransformer.default {
  /**
   * Returns an object containing all non-empty properties of the input object. Returns null if no
   * properties are non-empty.
   * @param input The config to process.
   */
  nonEmptyConfig(input) {
    let result = null;
    for (const [key, value] of Object.entries(input)) {
      if (Array.isArray(value) ? value.length > 0 : value !== undefined) {
        result = result || {};
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Writes the config file to disk if needed.
   * @param config The config to write.
   * @param node The original source node.
   * @param context The current transformer context.
   * @return `true` it the config was actually written.
   */
  writeConfigFile(config, node, context) {
    const processed = this.nonEmptyConfig(config);
    if (processed) {
      const configFile = this.constructor.splitFile(node, '.json');
      configFile.value = {
        dataType: _nodeOpcua.DataType.String,
        arrayType: _nodeOpcua.VariantArrayType.Scalar,
        value: JSON.stringify(config, null, '  ')
      };
      context.addNode(configFile);
    }
    return !!processed;
  }
}
exports.default = ConfigTransformer;
//# sourceMappingURL=ConfigTransformer.js.map