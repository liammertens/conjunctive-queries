import { Atom, HeadAtom } from "../DB/atom";
import { intersect, semijoin } from "../DB/joins";
import { Query, QueryResult } from "../DB/query";
import { VarTerm, isVar } from "../DB/term";
import { GYO } from "./GYO";
import { Node, isLeaf } from "./join_tree";

// This is a version of boolean Yannakakis
/*
To find all qs and Qs try to:
    - get all leaf nodes and compute qs (trivial)
    - propagate qs to their parents, for each direct parent node do:
        - compute qs from (trivial), for each propagated Qs, do:
            - semijoin qs with the computed propagated Qs
        - intersection of all semijoins => Qs of parent
    - repeat until no more parents left
        - The algorithm is guaranteed to end at the root(s)
*/
export function bool_yannakakis(query: Query) {
    const T = GYO(query);
    if (T) {
        function iter(leaves: Node[]) : Array<Array<any>> {
            const newLeaves: Set<Node> = new Set()
            for (const node of leaves) {
                // head of qs should contain all node variables = elements
                const headVars = node.elements.map(e => new VarTerm(e));
                const q = new Query(new HeadAtom(headVars), node.q_atoms);
                const qs = q.compute();
                if (node.children.length > 0) {
                    // apply the semijoins + intersections
                    let Qs: Array<Array<Array<any>>> = new Array();
                    for (const child of node.children) {
                        // due to bottom-up recursion, child.Qs are guaranteed to be computed
                        if (child.Qs) { // bypass type checking
                            Qs.push(semijoin(qs, child.Qs).tuples);
                            Qs = intersect(Qs);
                        }
                        if (Qs.length == 0) {
                            break;
                        }
                    }
                    // Qs and qs have the same head
                    node.Qs = new QueryResult(new HeadAtom(headVars), Qs);
                } else {
                    // base case => node is a leaf
                    node.Qs = qs;
                }
                if (!T?.isRoot(node) && node.parent) {
                    // repeat recursively until we are at the root (parent check is for type guards)
                    newLeaves.add(node.parent); // add the parent node for the next step of recursion
                }
            }
            if (newLeaves.size > 0) {
                return iter([...newLeaves])
            } else {
                // return Qs from root(s)
                // TODO: combine them here using cartesian product
                const res: Array<Array<any>> = []
                leaves.forEach(n => n.Qs?.tuples.forEach(tuple => res.push(tuple)))
                return res;
            }
        }
        const N = T.nodes;
        const leaves = N.filter(n => isLeaf(n)); // = all leaves, from all trees! => allows for iterating all of them at the same time
        const Qr = iter(leaves);
        return Qr.length > 0 // return true if Qr is not empty.
    } else {
        // query is cyclic => throw exception
        throw new Error("Given query is cyclic");
    }
}