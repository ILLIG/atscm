"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _through = require("through2");
var _Session = _interopRequireDefault(require("./Session"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * An object transform stream connected to atvise server.
 */
class Stream extends (0, _through.ctor)({
  objectMode: true
}) {
  /**
   * Creates a new Stream and starts opening a new session to atvise server.
   * @param {Object} [options] The options to use. See the through2 documentation for details.
   * @param {boolean} [options.keepSessionAlive=false] If the ativse server session should be closed
   * one the stream ends.
   * @emits {Session} Emits an `session-open` event once the session is open, passing the Session
   * instance.
   * @see https://github.Com/rvagg/through2#options
   */
  constructor(options = {}) {
    super(options);

    /**
     * `true` if the stream's atvise server session should be kept alive once the stream ends.
     * @type {Boolean}
     */
    this._keepSessionAlive = options.keepSessionAlive || false;
    _Session.default.create().then(session => this.session = session).then(session => this.emit('session-open', session)).catch(err => this.emit('error', err));
  }

  /**
   * Called just before the stream is closed: Closes the open session.
   * @param {function(err: ?Error, data: Object)} callback Called once the session is closed.
   */
  _flush(callback) {
    if (this.session && !this._keepSessionAlive) {
      _Session.default.close(this.session).then(() => callback()).catch(err => callback(err));
    } else {
      callback();
    }
  }
}
exports.default = Stream;
//# sourceMappingURL=Stream.js.map