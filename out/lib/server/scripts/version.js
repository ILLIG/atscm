"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.versionNode = void 0;
var _NodeId = _interopRequireDefault(require("../../model/opcua/NodeId"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* eslint-disable import/prefer-default-export */

/**
 * The node containing the currently installed server-scripts version.
 * @type {NodeId}
 */
const versionNode = exports.versionNode = new _NodeId.default('SYSTEM.LIBRARY.ATVISE.SERVERSCRIPTS.atscm.version');
//# sourceMappingURL=version.js.map