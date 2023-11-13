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
export function GYO(query: Query): JoinTree {
    const hg = new Hypergraph(query);
    const tree = new JoinTree;

    // TODO: add a guard to prevent infinite recursion when query would be cyclic 
    while (hg.edges.length > 0) {
        for (const edge of hg.edges) { // when we add to this array, the for loop will continue looping
            const e = [...edge]; // convert to an array => do this only once
            const res: [boolean, Set<string>] = ear(e, hg.edges.filter(x => !eqSet(x, edge)), new Set<string>(), new Array);
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
            } else { // e is not an ear => skip e for now and advance to next
                hg.removeEdge(edge);
                hg.edges.push(edge);
            }
            console.log(hg.edges);
        }
    }
    tree.setRoot();
    return tree;
}

/*
Determines recursively whether e is an ear given a set of possible witnesses.
If e is not an ear, the returned array has a false flag at idx 0.
Returns an array with the witness at index 1. If no witness (e is completely isolated), then idx 1 = empty set

e should be an array so we can use the Array.shift procedure

An edge e is an ear iff.:
    - all vertices belonging to e are exclusive to e, or...
    - There exists another edge w such that every vertex in e is either exclusive to e or also occuring in w:
        - set w to an edge if w = undefined && w is one of possible witnesses
        - if w is already set, check if the vertex occurs in w:
            - if not, discard w from possible witnesses and track back
*/
export function ear(e: Array<string>, witnesses: Array<Set<string>>, w: Set<string>, lastE: Array<string>): [boolean, Set<string>] {
    if (e.length > 0) {
        const vertex = e[0];
        if (witnesses.every((edge: Set<string>) => !edge.has(vertex))) { // vertex is isolated
            e.shift();
            return ear(e, witnesses, w, lastE);
        } else if (w.size > 0) { // vertex not isolated + witness was previously found
            if (w.has(vertex)) { // w is also a witness for this vertex
                e.shift();
                return ear(e, witnesses, w, lastE); // continue recursively
            } else { // w is not a valid witness for vertex => can never be a valid witness for any vertex of e anymore!
                const new_witnesses = witnesses.filter((el, idx, r) => !eqSet(el, w)); // remove w from possible witnesses
                // backtrack using array so that a new witness cam be found starting from the point in time where the previous one was set
                return ear(lastE, new_witnesses, new Set<string>(), new Array());
            }
        } else if (witnesses.length == 0) { // vertex not isolated + no possible witnesses left => e is not an ear, return e at idx 0
            return [false, new Set<string>()];
        } else { // no w assigned yet
            // recheck for isolation (loop over witnesses)
            for (const edge of witnesses) {
                if (edge.has(vertex)) {
                    w = edge;
                    break;
                }
            }
            if (w.size > 0) {
                return ear(e, witnesses, w, e); // keep track of e after setting w
            } else { // no witness found after all => query must be cyclic
                return [false, new Set<string>()]
            }
        }
    } else { // all vertices have been handled succesfully
        return [true, w];
    }
}