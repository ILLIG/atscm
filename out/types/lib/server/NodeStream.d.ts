/**
 * A stream of server nodes.
 */
export default class NodeStream extends Readable {
    /**
     * Creates new node stream.
     * @param {NodeId[]} nodesToBrowse The nodes to browse.
     * @param {Object} [options] The options to use.
     * @param {boolean} [options.recursive] If the stream should recurse child nodes.
     * @param {NodeId[]} [options.ignoreNodes] The nodes to ignore.
     */
    constructor(nodesToBrowse: NodeId[], options?: {
        recursive?: boolean;
        ignoreNodes?: NodeId[];
    });
    /**
     * If the discovered nodes should be browsed as well.
     * @type {Boolean}
     */
    recursive: boolean;
    /**
     * The timestamp when the stream started.
     * @type {number}
     */
    _start: number;
    /**
     * If the stream is destroyed.
     * @type {boolean}
     */
    _isDestroyed: boolean;
    /**
     * The stream's browser
     * @type {NodeBrowser}
     */
    _browser: NodeBrowser;
    /**
     * If the stream is destoyed.
     * @type {boolean}
     */
    get isDestroyed(): boolean;
    /**
     * Starts the browser.
     */
    _read(): void;
    /**
     * Destroys the stream.
     * @param {?Error} err The error that caused the destroy.
     * @param {function(err: ?Error): void} callback Called once finished.
     */
    _destroy(err: Error | null, callback: any): void;
    /**
     * The number of processed nodes.
     * @type {number}
     */
    get processed(): number;
    /**
     * The number of processed chunks per second.
     * @type {number}
     */
    get opsPerSecond(): number;
}
import { Readable } from 'stream';
import NodeBrowser from './NodeBrowser';
