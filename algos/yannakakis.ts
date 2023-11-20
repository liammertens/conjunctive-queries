import { Atom, HeadAtom } from "../DB/atom";
import { cartesian_product, intersect, join, projection, semijoin } from "../DB/joins";
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
        function iter(leaves: Node[]): boolean {
            const newLeaves: Set<Node> = new Set()
            for (const node of leaves) {
                // head of qs should contain all node variables = elements
                const headVars = node.elements.map(e => new VarTerm(e));
                const q = new Query(new HeadAtom(headVars), node.q_atoms);
                const qs = q.compute();
                if (node.children.length > 0) {
                    // apply the semijoins + intersections => this part is the reducer for D
                    let Qs: Array<Array<Array<any>>> = new Array();
                    for (const child of node.children) {
                        // due to bottom-up recursion, child.Qs are guaranteed to be computed
                        if (child.Qs) { // bypass type checking
                            Qs.push(semijoin(qs, child.Qs).tuples);
                            Qs = intersect(Qs);
                        }
                        if (Qs.length == 0) {
                            // early termination => consequent intersections will be empty too
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
                    newLeaves.add(node.parent); // use the parent node for the next step of recursion
                }
            }
            if (newLeaves.size > 0) {
                // we still have nodes to process
                return iter([...newLeaves])
            } else {
                // return Qs from root(s)
                // we do not need to combine them using cartesian product (if we have more than one)
                // Checking if none of them are empty (Qr = {}) is sufficient in the boolean case!
                let res: boolean = false
                T?.roots.forEach(r => {
                    if (r.Qs) { // bypass type checking
                        res = res && (r.Qs.tuples.length > 0);
                    }
                });
                return res;
            }
        }
        const N = T.nodes;
        const leaves = N.filter(n => isLeaf(n)); // = all leaves, from all trees! => allows for iterating all of them at the same time
        const res = iter(leaves);
        return res // return true if Qr is not empty.
    } else {
        // query is cyclic => throw exception
        throw new Error("Given query is cyclic");
    }
}

export function yannakakis(query: Query): QueryResult | Boolean {
    const T = GYO(query)
    if (T) {
        function pass1(leaves: Node[]): void {
            const newLeaves: Set<Node> = new Set() // use set, because multiple children might have same parent!
            for (const node of leaves) {
                // head of qs should contain all node variables = elements
                const headVars = node.elements.map(e => new VarTerm(e));
                const q = new Query(new HeadAtom(headVars), node.q_atoms);
                const qs = q.compute();
                if (node.children.length > 0) {
                    // apply the semijoins + intersections => this part is the reducer for D
                    let Qs: Array<Array<Array<any>>> = new Array();
                    for (const child of node.children) {
                        // due to bottom-up recursion, child.Qs are guaranteed to be computed
                        if (child.Qs) { // bypass type checking
                            Qs.push(semijoin(qs, child.Qs).tuples);
                            Qs = intersect(Qs);
                        }
                        if (Qs.length == 0) {
                            // early termination => consequent intersections will be empty too
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
                    newLeaves.add(node.parent); // use the parent node for the next step of recursion
                }
            }
            if (newLeaves.size > 0) {
                pass1([...newLeaves]);
            }
        }
        // pass 2 starts from the roots
        // we overwrite all Qs (instead of using a separate variable As)
        function pass2(roots: Node[]): void {
            const newParents: Array<Node> = new Array() // no need to use set here, as every child can come from only 1 parent
            for (const node of roots) {
                if (node.children.length > 0) {
                    // apply the semijoin of Qs from child with Qs of parent
                    for (const child of node.children) {
                        // All Qs are computed in 1st pass
                        if (child.Qs && node.Qs) { // bypass type checking
                            child.Qs = semijoin(child.Qs, node.Qs);
                        }
                        newParents.push(child);
                    }                        
                }
            }
            if (newParents.length > 0) {
                pass2(newParents)
            }
        }
        // this pass starts from the direct parents of all leaf nodes
        // after executing this pass, Qr will contain all consistent tuples, BUT, we need to project them onto the head of our query.
        function pass3(nodes: Node[]) {
            const nextNodes: Set<Node> = new Set();
            for (const node of nodes) {
                for (const child of node.children) {
                    if (node.Qs && child.Qs) {
                        let Os = join(node.Qs, child.Qs);
                        const variables = Os.variables; // set to be used for projection of variables
                        query.head.terms.forEach(t => variables.add(t.val)); // union of node vars and query head vars
                        node.Qs = projection([...variables], Os);
                    }
                }
                if (node.parent) {
                    nextNodes.add(node.parent);
                }
            }
            if (nextNodes.size > 0) {
                pass3([...nextNodes]);
            }
        }

        const N = T.nodes;
        const leaves = N.filter(n => isLeaf(n));
        pass1(leaves);

        if (query.head.terms.length == 0) { // => boolean yannakakis
            // return Qs from root(s)
            // we do not need to combine them using cartesian product (if we have more than one)
            // Checking if none of them are empty (Qr = {}) is sufficient in the boolean case!
            let res: boolean = true
            T?.roots.forEach(r => {
                if (r.Qs) { // bypass type checking
                    res = res && (r.Qs.tuples.length > 0);
                }
            });
            return res;
        } else {
            const roots = [...T.roots]
            pass2(roots);
            const pass3_nodes: Node[] = []
            leaves.forEach(l => {
                if (l.parent) {
                    pass3_nodes.push(l.parent);
                }
            });
            pass3(pass3_nodes);

            let res: QueryResult = new QueryResult(query.head, []);
            T?.roots.forEach(r => {
                if (r.Qs) { // bypass type checking
                    if (res) {
                        res = r.Qs;
                    } else {
                        // compute cartesian product in case of multiple disjoint join trees
                        res = cartesian_product(res, r.Qs);
                    }
                }
            });
            // only return tuples containing queried variables (in the query head)
            return projection(query.head.terms.map(t => t.val), res);
        }
    } else {
        // query is cyclic => throw exception
        throw new Error("Given query is cyclic");
    }
}