"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _opcua_status_code = require("node-opcua/lib/datamodel/opcua_status_code");
var _gulplog = _interopRequireDefault(require("gulplog"));
var _Stream = _interopRequireDefault(require("./Stream"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* Needed as long as https://github.com/gajus/eslint-plugin-jsdoc/issues/56 is open */
/* eslint-disable jsdoc/check-param-names */

/**
 * A stream that process atvise server requests in parallel.
 * @abstract
 */
class QueueStream extends _Stream.default {
  /**
   * Creates a new QueueStream with the given options.
   * @param {Object} [options] The options to use.
   * @param {number} [options.maxParallel] The maximum of parallel tasks to execute.
   */
  constructor(options = {}) {
    const maxParallel = options.maxParallel || 250;
    super(Object.assign(options, {
      highWaterMark: maxParallel
    }));

    /**
     * The number of running operations.
     * @type {Number}
     */
    this._processing = 0;

    /**
     * The number of chunks processed so far.
     * @type {Number}
     */
    this._processed = 0;

    /**
     * The queued chunks.
     * @type {*[]}
     */
    this._queued = [];

    /**
     * The maximum of parallel tasks to execute
     * @type {number}
     */
    this._maxParallel = maxParallel;

    /**
     * The timestamp of the date when the stream was created.
     * @type {Number}
     */
    this._start = new Date().getTime();
    this.on('processed-chunk', () => {
      if (!this.queueEmpty) {
        this._processChunk(this._queued.shift());
      } else if (this._processing === 0) {
        this.emit('drained');
      }
    });
  }

  /**
   * `true` if there are queued operations or an operation is running right now.
   * @type {boolean}
   */
  get hasPending() {
    return this._processing > 0 || this._queued.length > 0;
  }

  /**
   * `true` if there are no queued operations.
   * @type {boolean}
   */
  get queueEmpty() {
    return this._queued.length === 0;
  }

  /**
   * The number of chunks already processed.
   * @type {number}
   */
  get processed() {
    return this._processed;
  }

  /**
   * The number of processed chunks per second.
   * @type {number}
   */
  get opsPerSecond() {
    return this._processed / ((new Date().getTime() - this._start) / 1000) || 0;
  }

  /**
   * The error message to use when processing a chunk fails. **Must be overridden by all
   * subclasses!**.
   * @param {*} chunk The chunk being processed.
   * @return {string} The error message to use.
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  processErrorMessage(chunk) {
    throw new Error('QueueStream#processErrorMessage must be implemented by all subclasses');
  }

  /**
   * The function to call when a chunk is ready to be processed. **Must be overridden by all
   * subclasses.**.
   * @param {*} chunk The chunk to process.
   * @param {function(err: Error, statusCode: node-opcua~StatusCodes, onSuccess: function)}
   * handleErrors Call this function to handle errors and bad status codes. When no error occured
   * and the status code received is fine, `onSuccess` is called. Further processing of valid
   * chunks, for example Recursions should happen in `onSuccess`. **Note that `onSuccess` is an
   * asynchronous function with a callback as an argument.**.
   * @example <caption>Basic implementation</caption>
   * class MyQueueStream extends QueueStream {
   *   ...
   *   processChunk(chunk, handle) {
   *     client.session.doSomething((err, result, statusCode) => handle(err, statusCode, done => {
   *       // This is called if err is falsy and status code is node-opcua~StatusCodes.Good
   *       doSomethingWith(result);
   *       done();
   *     }));
   *   }
   *   ...
   * }
   * @example <caption>Implement a recursion</caption>
   * class RecursiveQueueStream extends QueueStream {
   *   ...
   *   processChunk(chunk, handle) {
   *     client.session.doSomething((err, result, statusCode) => handle(err, statusCode, done => {
   *       // Write the result back to the stream.
   *       // This means, that `result` will be queued and, as soon as possible, #processChunk will
   *       // be called with `result` as the `chunk` argument.
   *       this.write(result, null, done);
   *     }));
   *   }
   *   ...
   * }
   * @example <caption>Allowing some invalid status codes</caption>
   * import { StatusCodes } from 'node-opcua';
   *
   * class FriendlyQueueStream extends QueueStream {
   *   ...
   *   processChunk(chunk, handle) {
   *     client.session.doSomething((err, result, statusCode) => {
   *       if (statusCode === StatusCodes.BadUserAccessDenied) {
   *         Logger.warn(`Ignored invalid status: ${statusCode.description}`);
   *         handle(err, StatusCodes.Good, done => done());
   *       } else {
   *         handle(err, statusCode, done => done());
   *       }
   *     });
   *   }
   *   ...
   * }
   * @abstract
   */
  processChunk(chunk, handleErrors) {
    // eslint-disable-line no-unused-vars
    handleErrors(new Error('QueueStream#processChunk must be implemented by all subclasses'));
  }

  /**
   * Calls {@link QueueStream#processChunk} and handles errors and invalid status codes.
   * @param {*} chunk The chunk to process.
   * @emits {*} Emits a `processed-chunk` event once a chunk was processed.
   */
  _processChunk(chunk) {
    this._processing++;
    this.processChunk(chunk, (err, statusCode, onSuccess) => {
      const finished = error => {
        this._processing--;
        this._processed++;
        this.emit('processed-chunk', chunk, error);
      };
      let error = err;
      if (err) {
        const message = `${this.processErrorMessage(chunk)}: ${err.message}`;
        if (process.env.CONTINUE_ON_FAILURE === 'true') {
          _gulplog.default.error(`FAILURE: ${message}`);
        } else {
          this.emit('error', Object.assign(err, {
            message
          }));
        }
      } else if (statusCode !== _opcua_status_code.StatusCodes.Good) {
        const message = `${this.processErrorMessage(chunk)}: ${statusCode.description}`;
        error = new Error(message);
        if (process.env.CONTINUE_ON_FAILURE === 'true') {
          _gulplog.default.error(`FAILURE: ${message}`);
        } else {
          this.emit('error', new Error(message));
        }
      } else {
        onSuccess(finished);
        return;
      }
      finished(error);
    });
  }

  /**
   * Enqueues the given chunk for processing.
   * @param {*} chunk The chunk to enqueue.
   */
  _enqueueChunk(chunk) {
    if (this._processing < this._maxParallel) {
      this._processChunk(chunk);
    } else {
      this._queued.push(chunk);
    }
  }

  /**
   * Calls {@link QueueStream#_enqueueChunk} as soon as the stream's session is opened.
   * @param {*} chunk The chunk to transform.
   * @param {string} enc The encoding used.
   * @param {Function} callback Called once the chunk has been enqueued.
   */
  _transform(chunk, enc, callback) {
    if (this.session) {
      this._enqueueChunk(chunk);
      callback();
    } else {
      this.once('session-open', () => {
        this._enqueueChunk(chunk);
        callback();
      });
    }
  }

  /**
   * Waits for pending operations to complete.
   * @param {Function} callback Called once all queued chunks have been processed.
   */
  _flush(callback) {
    if (this.hasPending) {
      this.once('drained', () => {
        super._flush(callback);
      });
    } else {
      super._flush(callback);
    }
  }
}
exports.default = QueueStream;
//# sourceMappingURL=QueueStream.js.map