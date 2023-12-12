import { Query } from "../DB/query";
import { HyperEdge, Hypergraph, eqSet } from "./hypergraph";
import { JoinTree, Node } from "./join_tree";

/*
Implementation of the Graham-Yu-Ozsoyoglu (GYO) algorithm to test for acyclicty within a CQ:
    - Create a hypergraph for a given query
    - For every hyperedge e do:
        - Determine if e is an ear, if true, remove e from the set of edges + add edge from e to its witness (if any) in the join tree
            - Parent(e) = w and child(w) = e
            => bottom-up construction of the tree
        - If not, move on to next edge.
    - Find the node(s) with no parent:
        - if only 1, set this node as root
        - if more, add all roots to the set of roots

returns the join tree for acyclic queries and undefined for cyclic queries.
*/
export function GYO(query: Query): JoinTree | undefined {
    const hg = new Hypergraph(query);
    const tree = new JoinTree;

    // if a full pass is done over all edges and none is removed, set this flag to false to prevent inf. recursion
    // We might need to re-iterate over all edges after a full pass, because some edge that wasn't an ear earlier, might be one now (because we removed an edge)
    let pass_again = true;
    // O(n^3) with n = #edges in hg (very pessimistic worst-case, but possible if ears appear progressively at the last idx of edges)
    while (hg.edges.length > 0) {
        if (pass_again) {
            pass_again = false;
            // Inner loop terminates in O(k.n^2)
            for (const edge of hg.edges) { // n iterations (n = #hyperedges = #atoms in q)
                const e = [...edge.vertices]; // convert to an array
                const other_edges = hg.edges.filter(x => !eqSet(x.vertices, edge.vertices))
                const res = ear(e, other_edges, other_edges); // O(k.n), see ear function
                if (res[0]) { // e is an ear
                    let earNode = new Node(e, edge.atoms);
                    const oldEarNode = tree.getNode(earNode.toString());
                    if (oldEarNode) { // if ear was previously added to tree (as a witness), use the Node object already added to the tree
                        earNode = oldEarNode;
                    } else {
                        tree.addNode(earNode);
                    }                
    
                    if (res[1]) { // the chosen ear has a witness
                        const witnessNode = new Node([...res[1].vertices], res[1].atoms);
                        const witness = tree.getNode(witnessNode.toString());
                        if (witness) { // witness already exists in tree
                            witness.addChild(earNode);
                            earNode.parent = witness;
                        } else { // add witness to tree
                            witnessNode.addChild(earNode);
                            earNode.parent = witnessNode;
                            tree.addNode(witnessNode)
                        }
                    }
                    hg.removeEdge(edge);
                    pass_again = true;                 
                }
            }
        } else {
            return undefined;
        }
    }
    tree.setRoots();
    return tree;
}

/*
Determines recursively whether e is an ear given a set of possible witnesses.
If e is not an ear, the returned array has a false flag at idx 0.
Returns an array with the witness at index 1. If no witness (e is completely isolated), then idx 1 = empty set

e should be an array so we can index it. edges is the array of edges in the hypergraph excl. e (initially = witnesses).
w is the currently to be tested witness and lastVertex is the index of the vertex of e that had w as witness.

An edge e is an ear iff.:
    - all vertices belonging to e are exclusive to e, or...
    - There exists another edge w such that every vertex in e is either exclusive to e or also occuring in w:
        - set w to an edge if w = undefined && w is one of possible witnesses
        - if w is already set, check if the vertex occurs in w (or is isolated):
            - if not, discard w from possible witnesses and track back

For an ear with k vertices, in a graph with n hyperedges, this check takes O(k.n) time. If typescript allowed nested set membership checking, this could be done in O(k) time
*/
export function ear(e: Array<string>, edges: Array<HyperEdge>, witnesses: Array<HyperEdge>, w: HyperEdge | undefined = undefined, currentVertex: number = 0, lastVertex: number = 0): [boolean, HyperEdge | undefined] {
    if (currentVertex < e.length) {
        /*
        console.log('ear:', e)
        console.log('witnesses:', witnesses)
        console.log('lastE: ', lastE)
        console.log('w:', w)
        console.log('______________')
        */
        const vertex = e[currentVertex];
        if (edges.every((edge: HyperEdge) => !edge.vertices.has(vertex))) { // vertex is isolated => O(n) with n = #edges (#atoms)
            return ear(e, edges, witnesses, w, currentVertex+1, lastVertex);
        } else if (w) { // vertex not isolated + witness was previously found
            if (w.vertices.has(vertex)) { // w is also a witness for this vertex
                return ear(e, edges, witnesses, w, currentVertex+1, lastVertex); // continue recursively
            } else { // w is not a valid witness for vertex => can never be a valid witness for any vertex of e anymore!
                const vertices = w.vertices;
                const new_witnesses = witnesses.filter((el, idx, r) => !eqSet(el.vertices, vertices)); // remove w from possible witnesses => O(n)
                // backtrack using array so that a new witness cam be found starting from the point in time where the previous one was set
                return ear(e, edges, new_witnesses, undefined, lastVertex, lastVertex);
            }
        } else if (witnesses.length == 0) { // vertex not isolated + no possible witnesses left => e is not an ear, return e at idx 0
            return [false, undefined];
        } else { // no w assigned yet
            // search a witness w => O(n)
            for (const edge of witnesses) {
                if (edge.vertices.has(vertex)) {
                    w = edge;
                    break;
                }
            }
            if (w) { // a witness was found
                return ear(e, edges, witnesses, w, currentVertex+1, currentVertex); // keep track of e after setting w
            } else { // no witness found => query must be cyclic
                return [false, undefined]
            }
        }
    } else { // all vertices have been handled succesfully
        return [true, w];
    }
}