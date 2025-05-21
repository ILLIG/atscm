"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.approveToContinue = approveToContinue;
exports.askForConfirmation = askForConfirmation;
exports.default = checkAtserver;
exports.loadProjectRequirement = loadProjectRequirement;
exports.loadRemoteVersion = loadRemoteVersion;
var _opcua_node_ids = require("node-opcua/lib/opcua_node_ids");
var _fsExtra = require("fs-extra");
var _semver = require("semver");
var _gulplog = _interopRequireDefault(require("gulplog"));
var _prompts = _interopRequireDefault(require("prompts"));
var _chalk = require("chalk");
var _api = require("../api");
var _package = require("../../package.json");
var _fs = require("../lib/helpers/fs");
var _NodeId = _interopRequireDefault(require("../lib/model/opcua/NodeId"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
const atserverVersionNodeId = new _NodeId.default(`ns=0;i=${_opcua_node_ids.VariableIds.Server_ServerStatus_BuildInfo_SoftwareVersion}`);
async function loadProjectRequirement() {
  const packageManifest = await (0, _fsExtra.readJson)('./package.json');
  return packageManifest.engines && packageManifest.engines.atserver;
}
async function loadRemoteVersion() {
  const raw = (await (0, _api.readNode)(atserverVersionNodeId)).value;
  return (0, _semver.coerce)(raw).version;
}
async function askForConfirmation(_ref) {
  let {
      onAsk
    } = _ref,
    options = _objectWithoutProperties(_ref, ["onAsk"]);
  if (!process.stdin.isTTY) return false;
  if (onAsk) onAsk();
  return (await (0, _prompts.default)(_objectSpread({
    type: 'confirm',
    name: 'confirmed'
  }, options))).confirmed;
}
async function approveToContinue({
  log,
  continueOnError
}, error) {
  if (continueOnError) {
    log.warn((0, _chalk.red)(error.message));
    log.warn(`Using --continue, skipping...`);
    return;
  }
  const shouldContinue = await askForConfirmation({
    onAsk: () => _gulplog.default.error((0, _chalk.red)(error.message)),
    message: 'Do you want to continue anyway?'
  });
  if (!shouldContinue) {
    throw error;
  }
}
async function checkAtserver(context) {
  const {
    log
  } = context;
  log.debug('Checking atserver version');
  const atscmRequirement = _package.engines.atserver;
  const [projectRequirement, remoteVersion] = await Promise.all([loadProjectRequirement(), loadRemoteVersion()]);
  if (!(0, _semver.satisfies)(remoteVersion, atscmRequirement)) {
    log.debug(`Version ${remoteVersion} does not satisfy requirement ${atscmRequirement}`);
    log.warn((0, _chalk.yellow)(`Your atvise server version (${remoteVersion}) is not supported, it may or may not work.`));
    if ((0, _semver.gtr)(remoteVersion, atscmRequirement)) {
      log.info(`You're running a newer version of atvise server. Please run 'atscm update' to check for updates.`);
    } else {
      log.info(`Please upgrade to atserver ${(0, _semver.minVersion)(atscmRequirement)} or above.`);
    }
  }
  let updatePackage = false;
  if (!projectRequirement) {
    log.info(`Your package.json file doesn't specify an atserver version, adding it...`);
    updatePackage = true;
  } else if (!(0, _semver.satisfies)(remoteVersion, projectRequirement)) {
    await approveToContinue(context, new Error(`Your project is setup with atserver ${projectRequirement} but you're using ${remoteVersion}`));
    updatePackage = await askForConfirmation({
      message: `Use atvise server ${remoteVersion} as new default?`
    });
  } else {
    log.debug(`Running against atserver ${remoteVersion}`);
  }
  if (updatePackage) {
    await (0, _fs.updateJson)('./package.json', current => {
      /* eslint-disable no-param-reassign */
      if (!current.engines) current.engines = {};
      current.engines.atserver = remoteVersion;
      /* eslint-enable no-param-reassign */

      return current;
    });
  }
  return {
    version: remoteVersion
  };
}
//# sourceMappingURL=check-atserver.js.map