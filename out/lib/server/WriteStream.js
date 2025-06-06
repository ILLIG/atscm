"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _gulplog = _interopRequireDefault(require("gulplog"));
var _opcua_status_code = require("node-opcua/lib/datamodel/opcua_status_code");
var _nodeclass = require("node-opcua/lib/datamodel/nodeclass");
var _WaitingStream = _interopRequireDefault(require("./WaitingStream"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* Needed as long as https://github.com/gajus/eslint-plugin-jsdoc/issues/56 is open */
/* eslint-disable jsdoc/check-param-names */

// FIXME: Extend QueueStream directly

/**
 * A stream that writes all read {@link AtviseFile}s to their corresponding nodes on atvise server.
 * The underlying {@link TreeStream} ensures the nodes are processed in an order that respects the
 * parent-child relations between nodes. Nodes are created (if needed) before their children are
 * processed.
 */
class WriteStream extends _WaitingStream.default {
  /**
   * Creates a new write stream with the given {@link CreateNodeStream} and
   * {@link AddReferencesStream}. Implementer have to ensure this create stream is actually piped.
   * @param {CreateNodeStream} createStream The stream that handles node creations.
   * @param {AddReferencesStream} addReferencesStream The stream that adds missing node references.
   * @param {Object} options The options passed to the underlying {@link TreeStream}.
   */
  constructor(createStream, addReferencesStream, options) {
    super(options);

    /**
     * If a node has to be created first, it's callback is added to this map.
     * @type {Map<String, function(err: Error)}
     */
    this._createCallbacks = {};
    createStream.on('processed-chunk', ({
      nodeId
    }) => {
      const key = nodeId.toString();
      if (this._createCallbacks[key]) {
        this._createCallbacks[key](null);
      }
    });

    /**
     * The stream responsible for adding additional references.
     * @type {AddReferencesStream}
     */
    this._addReferencesStream = addReferencesStream;
  }

  /**
   * The error message to use when writing a file fails.
   * @param {AtviseFile} file The file being processed.
   * @return {string} The error message to use.
   */
  processErrorMessage(file) {
    return `Error writing ${file.nodeId}`;
  }

  /**
   * Pushes a node to the piped create stream and waits for the node to be created.
   * @param {AtviseFile} file The file create the node for.
   * @param {function(err: Error, statusCode: node-opcua~StatusCodes, onSuccess: function)}
   * handleErrors The error handler to call. See {@link QueueStream#processChunk} for details.
   */
  _createNode(file, handleErrors) {
    this._createCallbacks[file.nodeId.toString()] = err => {
      handleErrors(err, _opcua_status_code.StatusCodes.Good, done => done());
    };
    this.push(file);
  }

  /**
   * Returns a files parent node and type definition.
   * @param {AtviseFile} file The file to check.
   * @return {NodeId[]} The files dependencies.
   */
  dependenciesFor() {
    return [];
  }

  /**
   * Writes an {@link AtviseFile} to it's corresponding node on atvise server.
   * @param {AtviseFile} file The file to write.
   * @param {function(err: Error, statusCode: node-opcua~StatusCodes, onSuccess: function)}
   * handleErrors The error handler to call. See {@link QueueStream#processChunk} for details.
   */
  processChunk(file, handleErrors) {
    if (file.nodeClass.value !== _nodeclass.NodeClass.Variable.value) {
      // Non-variable nodes are just pushed
      this._createNode(file, handleErrors);
      return;
    }
    try {
      this.session.writeSingleNode(`ns=1;s=${file.nodeId}`, file.variantValue, (err, statusCode) => {
        if (statusCode === _opcua_status_code.StatusCodes.BadUserAccessDenied || statusCode === _opcua_status_code.StatusCodes.BadNotWritable) {
          _gulplog.default.warn(`Error writing node ${file.nodeId}
  - Make sure it is not opened in atvise builder
  - Make sure the corresponding datasource is connected`);
          handleErrors(err, _opcua_status_code.StatusCodes.Good, done => done());
        } else if (statusCode === _opcua_status_code.StatusCodes.BadNodeIdUnknown) {
          _gulplog.default.debug(`Node ${file.nodeId} does not exist: Attempting to create it...`);
          this._createNode(file, handleErrors);
        } else {
          handleErrors(err, statusCode, done => {
            // Push to add references stream
            this._addReferencesStream.push(file);
            done();
          });
        }
      });
    } catch (e) {
      handleErrors(e);
    }
  }
}
exports.default = WriteStream;
//# sourceMappingURL=WriteStream.js.map