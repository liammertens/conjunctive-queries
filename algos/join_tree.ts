// TODO: find a solution for multiple non-connected trees:
// use a set of roots and after finishing yannakakis as usual, combine their Qs using cartesian product
// if one of the Qs is empty, the query fails (boolean only!)

import { Atom } from "../DB/atom";
import { QueryResult } from "../DB/query";

// multiple trees can be semi-joined separately and then combined using cartesian product
export class JoinTree {
    nodes: Node[];
    root: Node | undefined;
    private nodeMap: Map<string, Node>; // for fast membership checking + node lookup, although uses more memory

    constructor() {
        this.nodes = new Array<Node>();
        this.nodeMap = new Map<string, Node>();
    }

    addNode(n: Node) {
        const nstr = n.toString();
        if (!this.nodeMap.has(nstr)) { // membership check might be unnecessary
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
    
    setRoot() {
        let r: Node;
        for (const n of this.nodes) {
            if (!n.parent) {
                r = n;
                this.root = n;
                break;
            }
        }
    }
    isRoot(n: Node): boolean {
        return this.root == n;
    }
}

export class Node {
    elements: Array<string>; // using set is unnecessary => duplicates have been handled in hypergraph construction
    q_atoms: Array<Atom>; // for associating tree nodes with query atoms => easy to get q{s} and Q{s}
    Qs: QueryResult | undefined; // will be assigned bottom-up => contains query results!
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