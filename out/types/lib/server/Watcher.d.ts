/**
 * Watches the given nodes for value changes.
 * @emit {ReadStream.ReadResult} Emits `change` events when a watched node changes.
 */
export default class Watcher extends Emitter<[never]> {
    /**
     * Creates a new Watcher with the given nodes.
     * @param {NodeId[]} nodes The nodes to watch (recursively).
     */
    constructor(nodes?: NodeId[]);
    /**
     * The browser used to subscribe to server nodes.
     * @type {NodeBrowser}
     */
    _nodeBrowser: NodeBrowser;
    /**
     * Resolved once the server subscription is set up.
     * @type {Promise<any>}
     */
    subscriptionStarted: Promise<any>;
    /**
     * Initializes a server subscription.
     * @return {Promise<node-opcua~ClientSubscription>} A setup subscription.
     */
    _setupSubscription(): Promise<node>;
    /** The current session, if connected @type {Session} */
    _session: Session;
    /**
     * Subscribes to value changes of a single node.
     * @param {BrowsedNode} node A browsed node.
     */
    _subscribe(node: BrowsedNode): Promise<any>;
    /**
     * Called once a change has been detected and emits a 'change' or 'delete' event.
     * @param {Object} node The node that changed.
     * @param {?node-opcua~Variant} dataValue The current value.
     */
    _handleChange({ nodeId }: any, dataValue: any): void;
    /**
     * Ends monitoring nodes.
     */
    close(): void;
}
import Emitter from 'events';
import NodeBrowser from './NodeBrowser';
import Session from './Session';
