"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _readline = _interopRequireDefault(require("readline"));
var _gulplog = _interopRequireDefault(require("gulplog"));
var _ProjectConfig = _interopRequireDefault(require("../../config/ProjectConfig"));
var _Transformer = _interopRequireWildcard(require("../transform/Transformer"));
var _WriteStream = _interopRequireDefault(require("../server/WriteStream"));
var _CreateNodeStream = _interopRequireDefault(require("../server/CreateNodeStream"));
var _AddReferencesStream = _interopRequireDefault(require("../server/AddReferencesStream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A stream that transforms read {@link vinyl~File}s and pushes them to atvise server.
 */
class PushStream {
  /**
   * Creates a new PushSteam based on a source file stream.
   * @param {Stream} srcStream The file stream to read from.
   */
  constructor(srcStream) {
    const createStream = new _CreateNodeStream.default();
    const addReferencesStream = new _AddReferencesStream.default();
    const writeStream = new _WriteStream.default(createStream, addReferencesStream);
    const printProgress = setInterval(() => {
      _gulplog.default.info(`Pushed: ${writeStream._processed} (${writeStream.opsPerSecond.toFixed(1)} ops/s)`);
      if (_gulplog.default.listenerCount('info') > 0) {
        _readline.default.cursorTo(process.stdout, 0);
        _readline.default.moveCursor(process.stdout, 0, -1);
      }
    }, 1000);
    return _Transformer.default.applyTransformers(srcStream, _ProjectConfig.default.useTransformers, _Transformer.TransformDirection.FromFilesystem).pipe(writeStream).pipe(createStream).pipe(addReferencesStream).on('finish', () => {
      if (_gulplog.default.listenerCount('info') > 0) {
        _readline.default.cursorTo(process.stdout, 0);
        _readline.default.clearLine(process.stdout);
      }
      clearInterval(printProgress);
    });
  }
}
exports.default = PushStream;
//# sourceMappingURL=PushStream.js.map