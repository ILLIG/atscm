"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _validateNpmPackageName = _interopRequireDefault(require("validate-npm-package-name"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A static class containing validators for the options used when running "atscm init".
 */
class InitOptionsValidator {
  /**
   * Validates a project name to be a valid npm package name.
   * @param {string} value The name to validate.
   * @return {boolean|string} Returns true if `value` is a valid npm package name, or an error
   * message otherwise.
   */
  static name(value) {
    const result = (0, _validateNpmPackageName.default)(value);
    if (result.errors) {
      return result.errors[0];
    }

    // First letter must be a letter
    if (value.match(/^@?[a-z]+/i) === null) {
      return 'name must start with a letter';
    }
    if (value === 'atscm') {
      return "'atscm' is not allowed";
    }
    return result.validForNewPackages ? true : result.warnings[0];
  }
}
exports.default = InitOptionsValidator;
//# sourceMappingURL=OptionsValidator.js.map