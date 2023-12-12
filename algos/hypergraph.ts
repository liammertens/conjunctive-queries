import { Atom } from "../DB/atom";
import { Query } from "../DB/query";
import { isVar } from "../DB/term";

/*
    Helper function to determine whether 2 sets are equal.
    Traverses set x and performs membership check (O(1)) on set y for each element.

    Complexity: O(n), with n = size of set x (max. size of 1 atom)
*/
export function eqSet(xs: Set<string>, ys: Set<string>) {
    return xs.size == ys.size && [...xs].every(x => ys.has(x));
}


export class Hypergraph {
    edges: Array<HyperEdge>; // using set of sets is useless as set equality is not implemented in JS => sub-optimal worst-case performance

    // when adding a set of t terms, t membership tests need to be done for k times (k = #sets already added to edges) 
    // Complexity: O(k.2n), with n = #terms in query and k = #atoms in q (on avg.)
    // if set equality was implemented => O(n)
    // but often k << n, so this is not too bad...
    constructor(q: Query) {
        this.edges = new Array<HyperEdge>(); // keep track of query atoms corresponding to edges => facilitates associating variables with queries later on

        // Add terms from body
        for (const atom of q.body) {
            if (atom.variables.size > 0) {
                const vertices = atom.variables;
                if (this.edges.length == 0) {
                    this.edges.push(new HyperEdge(vertices, [atom]));
                } else { // only add hyperedge if unique
                    let prev_edge: HyperEdge | undefined;
                    for (const e of this.edges) {
                        if (eqSet(vertices, e.vertices)) {
                            prev_edge = e;
                            break;
                        }
                    }
                    if (prev_edge) {
                        // associate atom with prev. added edge
                        prev_edge.atoms.push(atom)
                    } else {
                        this.edges.push(new HyperEdge(vertices, [atom]));
                    }
                }
            }
        }
    }

    removeEdge(e: HyperEdge) {
        const newSet = this.edges.filter(x => !eqSet(e.vertices, x.vertices));
        this.edges = newSet;
    }
}

export class HyperEdge {
    vertices: Set<string>;
    atoms: Array<Atom>;

    constructor(v: Set<string>, a: Atom[]) {
        this.vertices = v;
        this. atoms = a;
    }
}