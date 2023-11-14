import { Query } from "../DB/query";
import { Hypergraph, eqSet } from "./hypergraph";
import { JoinTree, Node } from "./join_tree";

/*
Implementation of the Graham-Yu-Ozsoyoglu (GYO) algorithm to test for acyclicty within a CQ:
    - Create a hypergraph for a given query
    - For every hyperedge e do:
        - Determine if it is an ear, if true, remove e from the set of edges + add edge from e to its witness (if any) in the join tree
            - Parent(e) = w and child(w) = e
            => bottom-up construction of the tree
        - If not, move on to next edge.
    - Find the node(s) with no parent:
        - if only 1, set this node as root
        - if more, connect the roots of the trees in arbitrary fashion to get a single tree (TODO:)
*/
export function GYO(query: Query): JoinTree | undefined {
    const hg = new Hypergraph(query);
    const tree = new JoinTree;

    // if a full pass is done over all edges and none is removed, set this flag to false to prevent inf. recursion
    let pass_again = true;
    while (hg.edges.length > 0) {
        if (pass_again) {
            pass_again = false;
            for (const edge of hg.edges) { // when we add to this array, the for loop will continue looping
                const e = [...edge]; // convert to an array
                const other_edges = hg.edges.filter(x => !eqSet(x, edge))
                const res: [boolean, Set<string>] = ear(e, other_edges, other_edges, new Set<string>(), new Array());
                if (res[0]) { // e is an ear
                    let earNode = new Node(edge);
                    const oldEarNode = tree.getNode(earNode.toString());
                    if (oldEarNode) { // if ear was previously added to tree (as a witness), use the Node object already added to the tree
                        earNode = oldEarNode;
                    } else {
                        tree.addNode(earNode);
                    }                
    
                    if (res[1].size > 0) { // the chosen ear has a witness
                        const witnessNode = new Node(res[1]);
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
    tree.setRoot();
    return tree;
}

/*
Determines recursively whether e is an ear given a set of possible witnesses.
If e is not an ear, the returned array has a false flag at idx 0.
Returns an array with the witness at index 1. If no witness (e is completely isolated), then idx 1 = empty set

e should be an array so we can use the Array.shift procedure. edges is the array of edges in the hypergraph excl. e (initially = witnesses).
w is the currently to be tested witness and lastE is the set of vertices of e to be tested after choosing w as witness.

An edge e is an ear iff.:
    - all vertices belonging to e are exclusive to e, or...
    - There exists another edge w such that every vertex in e is either exclusive to e or also occuring in w:
        - set w to an edge if w = undefined && w is one of possible witnesses
        - if w is already set, check if the vertex occurs in w (or is isolated):
            - if not, discard w from possible witnesses and track back
*/
export function ear(e: Array<string>, edges: Array<Set<string>>, witnesses: Array<Set<string>>, w: Set<string>, lastE: Array<string>): [boolean, Set<string>] {
    if (e.length > 0) {
        /*
        console.log('ear:', e)
        console.log('witnesses:', witnesses)
        console.log('lastE: ', lastE)
        console.log('w:', w)
        console.log('______________')
        */
        const vertex = e[0];
        if (edges.every((edge: Set<string>) => !edge.has(vertex))) { // vertex is isolated
            e.shift();
            return ear(e, edges, witnesses, w, lastE);
        } else if (w.size > 0) { // vertex not isolated + witness was previously found
            if (w.has(vertex)) { // w is also a witness for this vertex
                e.shift();
                return ear(e, edges, witnesses, w, lastE); // continue recursively
            } else { // w is not a valid witness for vertex => can never be a valid witness for any vertex of e anymore!
                const new_witnesses = witnesses.filter((el, idx, r) => !eqSet(el, w)); // remove w from possible witnesses
                // backtrack using array so that a new witness cam be found starting from the point in time where the previous one was set
                return ear(lastE, edges, new_witnesses, new Set<string>(), new Array());
            }
        } else if (witnesses.length == 0) { // vertex not isolated + no possible witnesses left => e is not an ear, return e at idx 0
            return [false, new Set<string>()];
        } else { // no w assigned yet
            // search a witness w
            for (const edge of witnesses) {
                if (edge.has(vertex)) {
                    w = edge;
                    break;
                }
            }
            if (w.size > 0) {
                lastE = [...e] // copy e to avoid shifting lastE on e.shift()
                e.shift();
                return ear(e, edges, witnesses, w, lastE); // keep track of e after setting w
            } else { // no witness found after all => query must be cyclic
                return [false, new Set<string>()]
            }
        }
    } else { // all vertices have been handled succesfully
        return [true, w];
    }
}