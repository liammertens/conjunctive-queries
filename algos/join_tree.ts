// TODO: find a solution for multiple non-connected trees:
// loop over all nodes, if multiple have no parents, this means they are not connected and roots should be connected (see notes yannakakis)

import { Atom } from "../DB/atom";

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
    has(n: Node): boolean {
        return this.nodeMap.has(n.toString());
    }
    getNode(n: string): Node | undefined {
        return this.nodeMap.get(n)
    }
    // TODO: modify for multiple roots
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
}

export class Node {
    element: Set<string>;
    atoms: Array<Atom>; // for associating tree nodes with query atoms
    children: Array<Node>; // array: multiple children are allowed.
    parent: Node | undefined;
    constructor(el: Set<string>, atoms: Atom[]) {
        this.element = el;
        this.children = new Array<Node>();
        this.atoms = atoms;
    }

    addChild(n: Node) {
        this.children.push(n);
    }

    toString() {
        return JSON.stringify([...this.element])
    }
}