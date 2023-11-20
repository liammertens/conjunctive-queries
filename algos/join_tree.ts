// use a set of roots and after finishing yannakakis as usual, combine their Qs using cartesian product
// if one of the Qs is empty, the query fails (boolean only!)

import { Atom } from "../DB/atom";
import { QueryResult } from "../DB/query";

// multiple trees can be semi-joined separately and then combined using cartesian product
export class JoinTree {
    nodes: Node[];
    roots: Set<Node>;
    private nodeMap: Map<string, Node>; // for fast membership checking + node lookup, although uses more memory

    constructor() {
        this.nodes = new Array<Node>();
        this.nodeMap = new Map<string, Node>();
        this.roots = new Set();
    }

    addNode(n: Node) {
        const nstr = n.toString();
        if (!this.nodeMap.has(nstr)) { // membership check might be unnecessary => already done in GYO
            this.nodes.push(n);
            this.nodeMap.set(nstr, n);
        }        
    }
    removeNode(n: Node) {
        this.nodes = this.nodes.filter(x => x == n);
    }

    has(n: Node): boolean {
        return this.nodeMap.has(n.toString());
    }
    getNode(n: string): Node | undefined {
        return this.nodeMap.get(n)
    }
    
    // Adds all roots of each join tree.
    setRoots() {
        for (const n of this.nodes) {
            if (!n.parent) {
                this.roots.add(n);
                break;
            }
        }
    }
    isRoot(n: Node): boolean {
        return this.roots.has(n);
    }
}

export class Node {
    elements: Array<string>; // using set is unnecessary => duplicates have been handled in hypergraph construction
    q_atoms: Array<Atom>; // for associating tree nodes with query atoms => easy to get q{s} and Q{s}
    Qs: QueryResult | undefined; // will be assigned bottom-up => contains query results!. In 2nd pass will be re-assigned top-down and 3rd pass bottom-up again!
    children: Array<Node>; // array: multiple children are allowed.
    parent: Node | undefined;
    constructor(el: Array<string>, atoms: Atom[]) {
        this.elements = el;
        this.children = new Array<Node>();
        this.q_atoms = atoms;
    }

    addChild(n: Node) {
        this.children.push(n);
    }

    toString() {
        return JSON.stringify(this.elements);
    }
}

export function isLeaf(n: Node) {
    return n.children.length == 0;
}