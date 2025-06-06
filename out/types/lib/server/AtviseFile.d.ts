/**
 * A map providing shorter extensions for data types
 * @type {Map<node-opcua~DataType, String>}
 */
export const ExtensionForDataType: Map<node, any>;
/**
 * A map providing data types for shorter extensions (Reverse of {@link DataTypeForExtension}).
 * * @type {Map<String, node-opcua~DataType>}
 */
export const DataTypeForExtension: Map<string, node>;
/**
 * An extension to {@link vinyl~File} providing some additional, atvise-related properties.
 * @property {node-opcua~DataType} AtviseFile#dataType The {@link node-opcua~DataType} the node is
 * stored against on atvise server.
 * @property {NodeId} typeDefinition The file's type definition on atvise server.
 * FIXME: Additional properties not showing in API docs.
 */
export default class AtviseFile extends File.NullFile {
    /**
     * Returns a storage path for a {@link ReadStream.ReadResult}.
     * @param {ReadStream.ReadResult} readResult The read result to get a path for.
     */
    static pathForReadResult(readResult: ReadStream.ReadResult): any;
    /**
     * Encodes a node's value to file contents.
     * @param {*} value The value to encode.
     * @param {node-opcua~DataType} dataType The {@link node-opcua~DataType} to encode the value for.
     * @param {node-opcua~VariantArrayType} arrayType The files array type.
     * @return {?Buffer} The encoded file contents or null.
     */
    static encodeValue(value: any, dataType: any, arrayType: any): Buffer | null;
    /**
     * Decodes a file's contents to a node's value.
     * @param {Buffer} buffer The file contents to decode.
     * @param {node-opcua~DataType} dataType The {@link node-opcua~DataType} to decode the contents.
     * @param {node-opcua~VariantArrayType} arrayType The files array type.
     * @return {?*} The decoded node value or null.
     */
    static decodeValue(buffer: Buffer, dataType: any, arrayType: any): any | null;
    /**
     * As file mtimes do not support millisecond resolution these must be removed before storing
     * files.
     * @param {Date} date The original mtime.
     * @return {Date} The normalized mtime.
     */
    static normalizeMtime(date: Date): Date;
    /**
     * Creates a new {@link AtviseFile} for the given {@link ReadStream.ReadResult}.
     * @param {ReadStream.ReadResult} readResult The read result to create the file for.
     * @return {AtviseFile} The resulting file.
     */
    static fromReadResult(readResult: ReadStream.ReadResult): AtviseFile;
    /**
     * Creates a new AtviseFile and reads it's contents.
     * @param {Object} options See {@link vinyl~File} for available options.
     * @return {Promise} Resolved with the new file of rejected with the error that occured while
     * trying to read it's path.
     */
    static read(options?: any): Promise<any>;
    /**
     * Recalculates {@link AtviseFile#dataType}, {@link AtviseFile#arrayType} and
     * {@link AtviseFile#typeDefinition}. **Never call this method directly.**.
     */
    _getMetadata(): void;
    /**
     * The node's class.
     * @type {node-opcua~NodeClass}
     */
    _nodeClass: node;
    /**
     * References the node holds: In most cases this will be a single entry for
     * `'HasTypeDefinition'`.
     * @type {Map<String, NodeId[]>}
     */
    _references: Map<string, NodeId[]>;
    /**
     * The node's stored {@link node-opcua~VariantArrayType}.
     * @type {?node-opcua~VariantArrayType}
     */
    _arrayType: node | null;
    /**
     * A node's browse- and display name.
     * @type {?string}
     */
    _name: string | null;
    /**
     * The node's stored {@link node-opcua~DataType}.
     * @type {?node-opcua~DataType}
     */
    _dataType: node | null;
    /**
     * Computes a file's metadata if needed.
     * @return {AtviseFile} The file.
     */
    getMetadata(): AtviseFile;
    /**
     * The node's class.
     * @type {node-opcua~NodeClass}
     */
    get nodeClass(): node;
    /**
     * The file's {@link node-opcua~DataType}.
     * @type {node-opcua~DataType}
     */
    get dataType(): node;
    /**
     * The file's {@link node-opcua~VariantArrayType}.
     * @type {node-opcua~VariantArrayType}
     */
    get arrayType(): node;
    /**
     * The files's references.
     * @type {Map<string, NodeId|NodeId[]>}
     */
    get references(): Map<string, NodeId | NodeId[]>;
    /**
     * The file's type definition.
     * @type {node-opcua~NodeId}
     */
    get typeDefinition(): node;
    /**
     * `true` for reference config files (for example `.index.htm.json`).
     * @type {boolean}
     */
    get isReferenceConfig(): boolean;
    /**
     * `true` for files containing atvise displays.
     * @type {boolean}
     */
    get isDisplay(): boolean;
    /**
     * `true` for files containing atvise scripts.
     * @type {boolean}
     */
    get isScript(): boolean;
    /**
     * `true` for files containing atvise quick dynamics.
     * @type {boolean}
     */
    get isQuickDynamic(): boolean;
    /**
     * Sets the node value for the file.
     * @param {?*} newValue The value to set.
     */
    set value(newValue: any | null);
    /**
     * Returns the decoded node value for the file.
     * @type {?*} The file's decoded value.
     */
    get value(): any | null;
    /**
     * Returns the decoded node value for create node serverscript.
     * @type {?*} The file's decoded value.
     */
    get createNodeValue(): any | null;
    /**
     * Returns the node id associated with the file.
     * @type {NodeId} The file's node id.
     */
    get nodeId(): NodeId;
    /**
     * A file's browse and display name.
     * @type {string}
     */
    get name(): string;
    /**
     * A file's parent's node id.
     * @type {NodeId}
     */
    get parentNodeId(): NodeId;
    /**
     * Returns a new file with all attributes of the current file.
     * @param {Object} options See the {@link vinyl~File} docs for all options available.
     * @return {AtviseFile} The cloned file.
     * @see https://github.com/gulpjs/vinyl#filecloneoptions
     */
    clone(options: any): AtviseFile;
}
import File from 'vinyl';
import NodeId from '../model/opcua/NodeId';
