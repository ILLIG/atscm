"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addReferences = addReferences;
exports.callMethod = callMethod;
exports.callScript = callScript;
exports.createNode = createNode;
exports.readNode = readNode;
exports.writeNode = writeNode;
var _Session = _interopRequireDefault(require("./lib/server/Session"));
var _NodeId = _interopRequireDefault(require("./lib/model/opcua/NodeId"));
var _nodeOpcua = require("node-opcua");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// Helpers
/**
 * Creates a callback that calls `resolve` on success and `reject` on error.
 * @param {function(result: any): void} resolve The resolve callback.
 * @param {function(error: Error): void} reject The reject callback.
 * @example
 * // `aCallbackFn` is a function that accepts a node-style callback as the last argument
 * const promise = new Promise(
 *   (resolve, reject) => aCallbackFn('other', 'args', promisifiedCallback(resolve, reject)
 * );
 */
function promisifiedCallback(resolve, reject) {
  return (err, result) => {
    if (err) {
      return reject(err);
    }
    return resolve(result);
  };
}

/**
 * Promisifies a async function that would otherwise require a callback.
 * @param {function(cb: function(error: Error, result: any)):Promise<any>} call A function that
 * accepts a callback and performs the async action to wrap.
 */
function promisified(call) {
  return new Promise((resolve, reject) => call(promisifiedCallback(resolve, reject)));
}

/**
 * Creates a session, runs `action` and closes the session.
 * @param {function(session: Session): Promise<any>} action The action to run a session.
 */
async function withSession(action) {
  let result = null;
  let error = null;
  let session;
  if (global.atscmSession) {
    session = global.atscmSession;
  } else {
    session = await _Session.default.create();
    global.atscmSession = session;
  }
  try {
    result = await action(session);
  } catch (e) {
    error = e;
  }
  if (error) {
    throw etes;
  }
  return result;
}

// Reading/Writing

/**
 * Reads a single node's value.
 * @param {NodeId} nodeId The node to read.
 * @return {Promise<any>} The read value.
 */
async function readNode(nodeId) {
  return withSession(session => promisified(cb => session.readVariableValue(nodeId, cb))).then(({
    value,
    statusCode
  }) => {
    if (statusCode !== _nodeOpcua.StatusCodes.Good) {
      throw Object.assign(new Error(statusCode.description), {
        nodeId,
        statusCode
      });
    }
    return value;
  });
}

/**
 * Writes a single node's value.
 * @param {NodeId} nodeId The node to write.
 * @param {Variant} value The value to write.
 * @return {Promise<node-opcua~StatusCodes} The operation status result.
 */
function writeNode(nodeId, value) {
  return withSession(session => promisified(cb => session.writeSingleNode(nodeId, value, cb))).then(statusCode => {
    if (statusCode !== _nodeOpcua.StatusCodes.Good) {
      throw Object.assign(new Error(statusCode.description), {
        nodeId,
        statusCode
      });
    }
    return statusCode;
  });
}

// Methods / Scripts

/**
 * Calls an OPC-UA method on the server.
 * @param {NodeId} methodId The method's id.
 * @param {Array<Variant>} args The arguments to pass.
 */
function callMethod(methodId, args = []) {
  return withSession(session => promisified(cb => session.call([{
    objectId: methodId.parent,
    methodId,
    inputArguments: args
  }], cb))).then(([result] = []) => {
    if (result.statusCode.value) {
      throw Object.assign(new Error(result.statusCode.description), {
        methodId,
        inputArguments: args
      });
    }
    return result;
  });
}

/**
 * Calls a server script on the server.
 * @param {NodeId} scriptId The script's id.
 * @param {Object} parameters The parameters to pass, given as a map of Variants, like
 * `{ name: { ... } }`.
 */
function callScript(scriptId, parameters = {}) {
  return callMethod(new _NodeId.default('AGENT.SCRIPT.METHODS.callScript'), [{
    dataType: _nodeOpcua.DataType.NodeId,
    value: scriptId
  }, {
    dataType: _nodeOpcua.DataType.NodeId,
    value: scriptId.parent
  }, {
    dataType: _nodeOpcua.DataType.String,
    arrayType: _nodeOpcua.VariantArrayType.Array,
    value: Object.keys(parameters)
  }, {
    dataType: _nodeOpcua.DataType.Variant,
    arrayType: _nodeOpcua.VariantArrayType.Array,
    value: Object.values(parameters)
  }]).then(result => {
    const statusCode = result.outputArguments[0].value;
    if (statusCode.value) {
      throw Object.assign(new Error(`Script failed: ${statusCode.description}
${result.outputArguments[1].value}`), {
        scriptId,
        parameters
      });
    }
    return result;
  });
}

/**
 * Creates a new Node on the server.
 * @param {NodeId} nodeId The new node's id.
 * @param {Object} options The options to use.
 * @param {string} options.name The node's name.
 * @param {NodeId} [options.parentNodeId] The node's parent, defaults to the calculated parent
 * (`Test` for `Test.Child`).
 * @param {node-opcua~NodeClass} [options.nodeClass] The node's class, defaults so
 * `node-opcua~NodeClass.Variable`.
 * @param {NodeId} [options.typeDefinition] The node's type definition, must be provided for
 * non-variable nodes.
 * @param {NodeId} [options.modellingRule] The node's modelling rule.
 * @param {string} [options.reference] Name of the type of the node's reference to it's parent.
 * @param {node-opcua~Variant} [options.value] The node's value, required for all variable nodes.
 */
function createNode(nodeId, {
  name,
  parentNodeId = nodeId.parent,
  nodeClass = _nodeOpcua.NodeClass.Variable,
  typeDefinition = (0, _nodeOpcua.coerceNodeId)("ns=0;i=62"),
  modellingRule,
  reference,
  value
}) {
  var _value$arrayType;
  nodeId = (0, _nodeOpcua.coerceNodeId)(nodeId);
  parentNodeId = (0, _nodeOpcua.coerceNodeId)(parentNodeId || nodeId.parent);
  const isVariable = nodeClass === _nodeOpcua.NodeClass.Variable;
  const is64Bit = (value === null || value === void 0 ? void 0 : value.dataType) === _nodeOpcua.DataType.Int64 || (value === null || value === void 0 ? void 0 : value.dataType) === _nodeOpcua.DataType.UInt64;
  const variableOptions = isVariable ? {
    dataType: value.dataType,
    valueRank: (_value$arrayType = value.arrayType) !== null && _value$arrayType !== void 0 ? _value$arrayType : _nodeOpcua.VariantArrayType.Scalar,
    value: value.arrayType && value.arrayType !== _nodeOpcua.VariantArrayType.Scalar ? Array.from(value.value) : value.value
  } : {};
  if (is64Bit) {
    variableOptions.value = 0; // placeholder value
  }
  const paramObj = _objectSpread({
    nodeId,
    browseName: name,
    parentNodeId,
    nodeClass,
    typeDefinition,
    modellingRule,
    reference
  }, variableOptions);
  return callScript(new _NodeId.default("SYSTEM.LIBRARY.ATVISE.SERVERSCRIPTS.atscm.CreateNode"), {
    paramObjString: {
      dataType: _nodeOpcua.DataType.String,
      value: JSON.stringify(paramObj)
    }
  }).then(async result => {
    var _result$outputArgumen, _result$outputArgumen2, _result$outputArgumen3, _result$outputArgumen4;
    const createdNode = (_result$outputArgumen = result.outputArguments) === null || _result$outputArgumen === void 0 ? void 0 : (_result$outputArgumen2 = _result$outputArgumen[3]) === null || _result$outputArgumen2 === void 0 ? void 0 : (_result$outputArgumen3 = _result$outputArgumen2.value) === null || _result$outputArgumen3 === void 0 ? void 0 : (_result$outputArgumen4 = _result$outputArgumen3[0]) === null || _result$outputArgumen4 === void 0 ? void 0 : _result$outputArgumen4.value;
    if (createdNode && is64Bit) {
      console.warn("Writing actual 64-bit value after creation...");
      await writeNode(nodeId, value);
    }
    return result;
  });
}

/**
 * Adds references to a node.
 * @param {NodeId} nodeId The node to add the references to.
 * @param {Object} references The references to add.
 * @return {Promise} Resolved once the references were added.
 * @example <caption>Add a simple reference</caption>
 * import { ReferenceTypeIds } from 'node-opcua/lib/opcua_node_ids';
 *
 * addReferences('AGENT.DISPLAYS.Main', {
 *   [47]: ['VariableTypes.ATVISE.Display'],
 *   // equals:
 *   [ReferenceTypeIds.HasTypeDefinition]: ['VariableTypes.ATVISE.Display'],
 * })
 *   .then(() => console.log('Done!'))
 *   .catch(console.error);
 */
function addReferences(nodeId, references) {
  return callScript(new _NodeId.default('SYSTEM.LIBRARY.ATVISE.SERVERSCRIPTS.atscm.AddReferences'), {
    paramObjString: {
      dataType: _nodeOpcua.DataType.String,
      value: JSON.stringify({
        nodeId,
        references: Object.entries(references).map(([type, items]) => ({
          referenceIdValue: parseInt(type, 10),
          items
        }))
      })
    }
  });
}
//# sourceMappingURL=api.js.map