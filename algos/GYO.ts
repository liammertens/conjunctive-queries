import { Query } from "../DB/query";
import { Hypergraph, eqSet } from "./hypergraph";

/*
Implementation of the Graham-Yu-Ozsoyoglu (GYO) algorithm to test for acyclicty within a CQ:
    - Create a hypergraph for a given query
    - Apply GYO:
        - if acyclic return a join tree
        - else, return false
*/
export function GYO(query: Query): boolean {
    const hg = new Hypergraph(query);

    return true
}

/*
Determines recursively whether e is an ear given a set of possible witnesses.
If e is not an ear, the returned array has a non-empty array at idx 0.
Returns an array with the witness at index 1. If no witness (e is completely isolated), then idx 1 = empty set

An edge e is an ear iff.:
    - all vertices belonging to e are exclusive to e, or...
    - There exists another edge w such that every vertex in e is either exclusive to e or also occuring in w:
        - set w to an edge if w = undefined && w is one of possible witnesses
        - if w is already set, check if the vertex occurs in w:
            - if not, discard w from possible witnesses and track back
*/
function ear(e: Array<string>, witnesses: Array<Set<string>>, w: Set<string>): [Array<string>, Set<string>] {
    if (e.length > 0) {
        const vertex = e[0]
        if (witnesses.every((edge: Set<string>) => {
            if (edge.has(vertex)) {
                if (w.size == 0) {w = edge} // set a witness if not set already
                false;
            } else {
                true;
            }
        })) { // vertex is isolated
            e.shift();
            return ear(e, witnesses, w);
        } else if (w.size > 0) { // vertex not isolated
            if (w.has(vertex)) { // w is also a witness for this vertex
                e.shift();
                return ear(e, witnesses, w); // continue recursively
            } else { // w is not a valid witness for vertex => can never be a valid witness for any vertex of e anymore!
                const new_witnesses = witnesses.filter((el, idx, r) => !eqSet(el, w)); // remove w from possible witnesses
                return ear(e, new_witnesses, new Set<string>());
            }
        } else { // vertex not isolated + no possible witnesses left => e is not an ear, return e at idx 0
            return [e, new Set<string>()];
        }
    } else { // all vertices have been handled succesfully
        return [e, w];
    }
}