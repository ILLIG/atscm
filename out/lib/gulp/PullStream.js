"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _readline = _interopRequireDefault(require("readline"));
var _gulplog = _interopRequireDefault(require("gulplog"));
var _ProjectConfig = _interopRequireDefault(require("../../config/ProjectConfig"));
var _Transformer = _interopRequireWildcard(require("../transform/Transformer"));
var _dest = _interopRequireDefault(require("./dest"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * A stream that transforms read {@link ReadStream.ReadResult}s and stores the on the filesystem.
 */
class PullStream {
  /**
   * Creates a new PullStream based on a stream that writes {@link ReadStream.ReadResult} which may
   * be an instance of {@link ReadStream}.
   * @param {ReadStream} readStream The stream to read from.
   */
  constructor(readStream) {
    const printProgress = setInterval(() => {
      _gulplog.default.info(`Pulled: ${readStream.processed} (${readStream.opsPerSecond.toFixed(1)} ops/s)`);
      if (_gulplog.default.listenerCount('info') > 0) {
        _readline.default.cursorTo(process.stdout, 0);
        _readline.default.moveCursor(process.stdout, 0, -1);
      }
    }, 1000);
    return _Transformer.default.applyTransformers(readStream, _ProjectConfig.default.useTransformers, _Transformer.TransformDirection.FromDB).pipe((0, _dest.default)('./src')) // FIXME: Get from config file
    .on('finish', () => {
      if (_gulplog.default.listenerCount('info') > 0) {
        _readline.default.clearLine(process.stdout, 0);
        _readline.default.cursorTo(process.stdout, 0);
      }
      clearInterval(printProgress);
    });
  }
}
exports.default = PullStream;
//# sourceMappingURL=PullStream.js.map