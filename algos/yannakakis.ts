import { HeadAtom } from "../DB/atom";
import { cartesian_product, intersect, join, projection, semijoin } from "../DB/joins";
import { Query, QueryResult } from "../DB/query";
import { VarTerm } from "../DB/term";
import { GYO } from "./GYO";
import { Node, isLeaf } from "./join_tree";

export function yannakakis(query: Query): QueryResult | Boolean {
    const T = GYO(query) // O(|q|^3)
    if (T) {
        /*
        To find all qs and Qs try to:
            - get all leaf nodes and compute qs (trivial)
            - for each direct parent node p do:
                - Propagate Qs from all direct children of p:
                    - semijoin qs of p with the propagated Qs
                - intersection of all semijoins => Qs of p
            - repeat until no more parents left
                - Pass1 is guaranteed to end at the root(s)
        */
        function pass1(leaves: Node[]): void {
            const newLeaves: Set<Node> = new Set() // use set, because multiple children might have same parent!
            for (const node of leaves) {
                // head of qs should contain all node variables = elements
                const headVars = node.elements.map(e => new VarTerm(e));
                const q = new Query(new HeadAtom(headVars), node.q_atoms);
                const qs = q.compute();
                if (node.children.length > 0) {
                    //let Qs: Array<Array<Array<any>>> = new Array();
                    let semijoined: QueryResult[] = new Array()
                    let Qs: QueryResult = new QueryResult(q.head, []);
                    for (const child of node.children) {
                        // due to bottom-up recursion, child.Qs are guaranteed to be computed
                        if (child.Qs) { // bypass type checking
                            semijoined.push(semijoin(qs, child.Qs));
                            Qs = intersect(semijoined);
                        }
                        if (Qs.tuples.length == 0) {
                            // early termination => consequent semijoins will be empty too
                            break;
                        }
                    }
                    // Qs and qs have the same head
                    node.Qs = Qs;
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


            let res = roots[0].Qs
            T.roots.forEach(r => {
                if (r.Qs && res) { // bypass type checking
                    if (res !== r.Qs) {
                        // in the first iteration, avoid doing root1 x root1
                        // compute cartesian product in case of multiple disjoint join trees
                        res = cartesian_product(res, r.Qs);
                    }
                }
            });
            // only return tuples containing queried variables (in the query head)
            if (res) {
                return projection(query.head.terms.map(t => t.val), res);
            } else {
                // else branch would never occur, as we  always have at least 1 root (res can never be undefined, but we have to bypass TS typing)
                return new QueryResult(query.head, []);
            }            
        }
    } else {
        // query is cyclic => throw exception
        throw new Error("Given query is cyclic");
    }
}