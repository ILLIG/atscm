"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = pull;
exports.performPull = performPull;
var _mri = _interopRequireDefault(require("mri"));
var _fsExtra = require("fs-extra");
var _gulplog = _interopRequireDefault(require("gulplog"));
var _NodeBrowser = _interopRequireDefault(require("../lib/server/NodeBrowser"));
var _ProjectConfig = _interopRequireDefault(require("../config/ProjectConfig"));
var _Transformer = _interopRequireWildcard(require("../lib/transform/Transformer.js"));
var _dest = _interopRequireDefault(require("../lib/gulp/dest"));
var _log = require("../lib/helpers/log");
var _tasks = require("../lib/helpers/tasks");
var _Session = _interopRequireDefault(require("../lib/server/Session"));
var _checkAtserver = _interopRequireDefault(require("../hooks/check-atserver"));
var _hooks = require("../hooks/hooks");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/**
 * Pulls the given nodes from the server.
 * @param {NodeId[]} nodes The nodes to pull from the server.
 * @param {Object} options Options passed to {@link NodeBrowser}.
 */
function performPull(nodes, options = {}) {
  const writeStream = (0, _dest.default)('./src', {
    cleanRenameConfig: options.clean
  });
  const applyTransforms = _Transformer.default.combinedTransformer(_ProjectConfig.default.useTransformers, _Transformer.TransformDirection.FromDB);
  const browser = new _NodeBrowser.default(_objectSpread(_objectSpread({}, options), {}, {
    async handleNode(node, {
      transform = true
    } = {}) {
      let removed = false;
      const context = {
        _added: [],
        addNode(n) {
          this._added.push(n);
        },
        remove: () => {
          removed = true;
        }
      };
      if (transform) {
        await applyTransforms(node, context);
      }
      if (removed) {
        return;
      }
      await writeStream.writeAsync(node);

      // Enqueue added nodes
      if (context._added.length) {
        context._added.forEach(n => this.addNode(n));
      }
    }
  }));
  return Object.assign(browser.browse(nodes).then(() => writeStream.writeRenamefile()), {
    browser
  });
}

/**
 * Pulls all nodes from atvise server.
 * @param {Object} [options] The options to use.
 * @param {boolean} [options.clean] If the source directory should be cleaned first.
 */
async function pull(options) {
  const {
    clean
  } = typeof options === 'object' ? options : (0, _mri.default)(process.argv.slice(2));
  _Session.default.pool();

  // Run hooks
  const context = (0, _hooks.setupContext)();
  await (0, _checkAtserver.default)(context);
  if (clean) {
    _gulplog.default.info('Using --clean, removing pulled files first');
    await (0, _fsExtra.emptyDir)('./src');
  }
  const promise = performPull(_ProjectConfig.default.nodes, {
    clean
  });
  return (0, _log.reportProgress)(promise, {
    getter: () => promise.browser._pushed,
    formatter: count => `Processed ${count} nodes`
  }).then(_tasks.finishTask, _tasks.handleTaskError);
}
pull.description = 'Pull all nodes from atvise server';
//# sourceMappingURL=pull.js.map