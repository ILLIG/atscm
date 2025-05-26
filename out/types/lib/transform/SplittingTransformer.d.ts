/**
 * A transformer that splits a node into multiple source nodes when pulling.
 */
export default class SplittingTransformer extends PartialTransformer {
    /**
     * The extension to add to container node names when they are pulled.
     * @abstract
     * @type {string}
     */
    static get extension(): string;
    /**
     * The source file extensions to allow.
     * @abstract
     * @type {string[]}
     */
    static get sourceExtensions(): string[];
    /**
     * Splits a {@link Node}: The resulting is a clone of the input file, with a different path.
     * @param {Node} node The file to split.
     * @param {?string} newExtension The extension the resulting file gets.
     * @return {Node} The resulting node.
     */
    static splitFile(node: Node, newExtension: string | null): Node;
    /**
     * Combines the container node and the source nodes to one single node.
     * @abstract
     * @param {BrowsedNode} node The container node.
     * @param {Map<string, BrowsedNode>} sourceNodes The source nodes.
     * @param {any} context The current context.
     */
    combineNodes(node: BrowsedNode, sourceNodes: Map<string, BrowsedNode>, context: any): void;
    /**
     * Combines the container node and the source nodes to one single node by calling
     * {@link SplittingTransformer#combineNodes}.
     * @param {BrowsedNode} node The container node.
     * @param {{ [extension: string]: BrowedNode }} sourceNodes The source nodes.
     * @param {any} context The current context.
     */
    _combineNodes(node: BrowsedNode, sourceNodes: {
        [extension: string]: BrowedNode;
    }, context: any): void;
}
import PartialTransformer from './PartialTransformer.js';
