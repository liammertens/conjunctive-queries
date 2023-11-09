import { Query } from "../DB/query";

/*
    Helper function to determine whether 2 sets are equal.
    Traverses set x and performs membership check (O(1)) on set y for each element.

    Complexity: O(n), with n = size of set x (max. size of 1 atom)
*/
export function eqSet(xs: Set<string>, ys: Set<string>) {
    return xs.size === ys.size && [...xs].every((x: string) => {
        ys.has(x);
    });
}


export class Hypergraph {
    edges: Array<Set<string>>; // using set of sets is useless as set equality is not implemented in JS => sub-optimal worst-case performance

    // when adding a set of t terms, t membership tests need to be done for k times (k = #sets already added to edges) 
    // Complexity: O(k.2n), with n = #terms in query and k = #atoms in q (on avg.)
    constructor(q: Query) {
        this.edges = new Array<Set<string>>();

        // Add terms from body
        for (const atom of q.body) {
            const hyperEdge: Set<string> = new Set();
            if (atom.terms.length > 0) {
                for (const t of atom.terms) {
                    hyperEdge.add(JSON.stringify(t)); // stringify for easy set member checking
                }
                if (this.edges.length == 0) {
                    this.edges.push(hyperEdge);
                } else { // only add hyperedge if unique
                    if (this.edges.every((e: Set<string>) => {
                        !eqSet(hyperEdge, e);
                    })) {
                        this.edges.push(hyperEdge)
                    }
                }
            }
        }

        // add terms from head atom
        const hyperEdge: Set<string> = new Set();
        for (const t of q.head.terms) {
            hyperEdge.add(JSON.stringify(t)); // stringify for easy set member checking
        }
        if (hyperEdge.size > 0) {
            if (this.edges.length == 0) {
                this.edges.push(hyperEdge);
            } else { // only add hyperedge if unique
                for (const e of this.edges) {
                    if (!eqSet(hyperEdge, e)) { 
                        this.edges.push(hyperEdge);
                        break; // prevent infinite looping, because we push to the array we are iterating!
                    }
                }
            }
        }
    }
}