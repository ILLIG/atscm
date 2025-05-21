"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupContext = setupContext;
var _gulplog = _interopRequireDefault(require("gulplog"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* eslint-disable import/prefer-default-export */

function setupContext({
  log,
  continueOnError
} = {}) {
  return {
    log: log || _gulplog.default,
    continueOnError: continueOnError === undefined ? process.env.CONTINUE_ON_FAILURE === 'true' : continueOnError
  };
}
//# sourceMappingURL=hooks.js.map