declare namespace NodeStream {
    type BrowseResult = {
        /**
         * The discovered node's id.
         */
        nodeId: NodeId;
        /**
         * -opcua~NodeClass} nodeClass The discovered node's class.
         */
        "": node;
        /**
         * An object holding arrays of references from the
         * discovered node to others, mapped by {@link node-opcua ~ReferenceTypeId} keys.
         */
        references: Map<string, NodeId[]>;
    };
}
declare namespace ReadStream {
    type ReadResult = NodeStream.BrowseResult;
}
