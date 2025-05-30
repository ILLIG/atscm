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
    constructor(nodesToBrowse: any[], options?: {
        recursive: boolean;
        ignoreNodes: any[];
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
import { Readable } from "node/stream";
import NodeBrowser from "./NodeBrowser";
