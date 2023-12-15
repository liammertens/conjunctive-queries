import { HeadAtom } from "./atom";
import { QueryResult } from "./query";
import { VarTerm } from "./term";

/*
semijoin(q1, q2) = keep all tuples of q1 where the valuation its variables that are also in q2 are consistent with q2.

- Create index for q2 on attributes represented by shared variables of q1 and q2
- Determine these shared variables
- for each tuple of q1:
    - compute the key tuple used as index key. This is done by creating a tuple where columns represented by shared
    variables have their original value and thos NOT represented by a shared var have null.
    - use the key tuple to get the set of all the consistent tuples in q2, if non-empty, add the q1 tuple to the result

Complexity: O(k.n2 + k.n1) with n1,n2 = #tuples in q1,q2 and k=#shared variables 
    => O(k.max(|q1|,|q2|))
    => linear in terms of input
*/
export function semijoin(q1: QueryResult, q2: QueryResult) {
    if (q1.tuples.length > 0 && q2.tuples.length > 0) {
        // keep track of indices of shared variables between q1 and q2
        const shared_vars_indices = new Set<number>(); // indices of vars in q1 that are shared with q2
        const shared_vars = new Set([...q1.variables].filter(v1 => q2.variables.has(v1))); // names of vars in q1 shared with q2
        q1.varMap.forEach((indices, var_name) => {
            indices.forEach(var_idx => {
                if (shared_vars.has(var_name)) {
                    shared_vars_indices.add(var_idx)
                }
            });
        });
        
        // make index for q2
        const index = createIndex(q1, q2); // O(k.n2) (n2 = #tuples in q2, k=#shared variables between q1/q2)

        const res = new QueryResult(q1.head, [])
        q1.tuples.forEach(tuple => {
            const idx_key_tuple: any[] = [] // this tuple contains the attributes of the q1 tuple that are used as index key
            tuple.forEach((attr, attr_i) => {
                if (shared_vars_indices.has(attr_i)) {
                    idx_key_tuple[attr_i] = attr;
                }
            });
            // mapping of q1 tuple to index key (see also createIndex)
            const consistent_tuples = index.get(JSON.stringify(idx_key_tuple));
            if (consistent_tuples) {
                res.tuples.push(tuple);
            }
        });
        return res
    } else {
        // return empty set
        return new QueryResult(q1.head, []);
    }    
}

/*
joins queries q1 and q2:
    - All tuples of q1 x q2 are kept if they have a consistent valuation for their variables.
    - Build an index for the largest relation (as in semijoin)
    - compute join
    - return queryresult with head = (head(q1) + head(q2))

=> complexity: O(k.n1.n2) with n1 = #tuples in the largest relation, n2 = avg. #matching tuples of the other relation, k =# attributes represented by common variables between q1 and q2
*/
export function join(q1: QueryResult, q2: QueryResult): QueryResult {
    let index: Map<any, any[][]>;
    let swappedQueries = false;
    if (q1.tuples.length <= q2.tuples.length) {
        // build index for q2
        index = createIndex(q1, q2);
    } else {
        // build index for q1 and swap q1 with q2 (avoid code duplication)
        // This way, when we refer to q2, it is guaranteed contain the most #tuples
        index = createIndex(q2,q1);
        const tmp = q1;
        q1 = q2;
        q2 = tmp;
        swappedQueries = true;
    }

    // keep track of indices of shared variables between q1 and q2
    const shared_vars_indices = new Set<number>();
    const shared_vars = new Set([...q1.variables].filter(v1 => q2.variables.has(v1)));
    q1.varMap.forEach((indices, var_name) => {
        indices.forEach(var_idx => {
            if (shared_vars.has(var_name)) {
                shared_vars_indices.add(var_idx)
            }
        });
    });

    const res: any[][] = [];
    q1.tuples.forEach(tuple => {
        const idx_key_tuple: any[] = [] // this tuple contains the attributes of the q1 tuple that are used as index key
        tuple.forEach((attr, attr_i) => {
            if (shared_vars_indices.has(attr_i)) {
                idx_key_tuple[attr_i] = attr;
            }
        });
        const consistent_tuples = index.get(JSON.stringify(idx_key_tuple));
        if (consistent_tuples) {
            if (swappedQueries) {
                // we have to switch around the result
                consistent_tuples.forEach(q2_tuple => res.push([...q2_tuple, ...tuple]));
            } else {
                consistent_tuples.forEach(q2_tuple => res.push([...tuple, ...q2_tuple]));
            }
        }
    });
    if (swappedQueries) {
        const headVars = [...q2.head.terms, ...q1.head.terms];
        return new QueryResult(new HeadAtom(headVars), res);
    } else {
        const headVars = [...q1.head.terms, ...q2.head.terms];
        return new QueryResult(new HeadAtom(headVars), res);
    }
}

/*
creates an index for the columns of q2 that are represented by common variables with q1.
Uses the internal varMap of q1 and q2 to find common variables.
The keys of the index are stringified tuples of q2 in the sort of tuples of q1:
    - if q1 has variable that do not occur in q2, then the key tuple has value null

eg. q1(x,y)={(1,2), (3,4), (5,6)}; q2(x)={(1), (2), (3)} 
    => key tuples = {(1,null), (2,null), (3,null)}
    => values = {(1), (2), (3)}

When the index is later used to index based on q1 tuples, the q1 tuples have to be mapped to a key tuple first (which is trivial to do, given the set of shared vars)

The variable constraints are enforced such that:
    - any attribute represented by some variable(s) occuring in both q1 and q2 is used for the key tuple (at place of occurence in q1)
    - if some shared variable occurs multiple times in q2, then it must represent equal-valued attributes for the tuple to be added to the index. 

We use hash indexing because we use the index to retrieve tuples that have exact matching attribute values.
The improvement of B-trees for range queries is thus unnecessary.
Insertion and lookup can be done in O(1) (and rehashing is pretty uncommon given that the dataset in our case is fixed)

=> complexity: O(k.n), with n = #tuples in q2 and k = #attributes represented by common variables between q1 and q2
    => it is best to ensure q2 is the smallest relation of the two beforehand!
*/
export function createIndex(q1: QueryResult, q2: QueryResult): Map<any, Array<Array<any>>> {
    const q2q1_map = new Map<number, number[]>(); // maps the indices of variables of q2 to indices in q1
    q1.varMap.forEach((indices: number[], var_name: string) => {
        const q2_var_indices = q2.varMap.get(var_name); // retrieve indices within tuples of q2 for common var var_name
        if (q2_var_indices) { // the same var occurs also in q2
            // add column of occurence of var in q2 to cols_to_idx
            q2_var_indices.forEach(idx => q2q1_map.set(idx, indices));
        }
    });

    const index = new Map()
    q2.tuples.forEach(tuple => {
        const index_key_tuple: any[] = []; // might contain null at some indices, this is okay
        let skip_tuple = false;
        for (let attr_i = 0; attr_i < tuple.length; attr_i++) {
            const q1_indices = q2q1_map.get(attr_i);
            const attr = tuple[attr_i];
            if (q1_indices) {
                // construct a tuple such that any attribute represented by a shared variable between q1 and q2 is in the right column
                // if the new tuple already has some value at idx => the var representing attr_i occurs multiple times in q2
                // => check if the value of attr is consistent for all variables representing attr
                q1_indices.forEach(idx => {
                    if (index_key_tuple[idx]) {
                        if (index_key_tuple[idx] != attr) {
                            skip_tuple = true;
                            return;
                        }
                    } else {
                        index_key_tuple[idx] = attr
                    } 
                });
            }
            if (skip_tuple) { // terminate inner loop early if valuation of variables is inconsistent
                break;
            }
        }
        if (!skip_tuple) {
            const k = JSON.stringify(index_key_tuple)
            const idx_entry = index.get(k)
            if (idx_entry) {
                idx_entry.push(tuple)
            } else {
                index.set(k, [tuple]);
            }
        }
    });
    return index;
}

/*
Compute the intersection of all queryresult tuples in s: 
    - s = [q1, q2, q3,...]
    - compute q1 ^ q2 ^ q3 ^ ...
    - left-to-right computation

By converting tuples to strings combined with sets, we can keep the complexity linear, instead of quadratic if we were to use arrays

Returns a queryresult containing all tuples gained from the intersect.
The head of this result corresponds to the head of s[0] => if the result is non-empty, all queryresults must have the same head atoms,
otherwise the intersect would be empty.

complexity: O(k.n) with k=#queryresults in s and n=#tuples in all queryresults
*/
export function intersect(s: QueryResult[]): QueryResult {
    if (s.length > 1) {
        // add a guard to check for any empty queryresults in s
        // can prevent useless stringify/filter operations
        for (const qr of s) {
            if (qr.tuples.length == 0) {
                return new QueryResult(s[0].head, []);
            }
        }

        // sort s first such that the smallest queryresult appears at s[0]
        // In our use case s<3 always, so this operation is fast, but can speed up the computation a lot later.
        s = s.sort((a,b) => a.tuples.length - b.tuples.length);

        const tuple_sets: Array<Set<string>> = new Array(s.length);
        // O(n) with n = total #tuples in all sets of s
        for (let i = 0; i < s.length; i++) {
            // convert tuples to strings in order to use set membership
            tuple_sets[i] = new Set(s[i].tuples.map(tuple => JSON.stringify(tuple)));
        }

        let res: Array<string> = [...tuple_sets[0]];
        for (let i = 1; i<tuple_sets.length; i++) {
            // arr.filter is linear in terms of its arr, but res will never be larger than set of tuples in s[0]
                // This is why we sort s first
            // in most cases, after the first iteration, res will be signif. smaller than its initial size
            res = res.filter(tuple => tuple_sets[i].has(tuple));
            if (res.length == 0) {
                // intersect is empty => all following intersects will be too
                // terminate early
                break;
            }
        }
        return new QueryResult(s[0].head, res.map(str => JSON.parse(str))); // parse the strings back to arrays
    } else if (s.length == 1){
        // intersect with yourself = yourself
        return s[0];
    } else {
        // or with nothing = nothing
        return new QueryResult(new HeadAtom([]), [])
    }
}

export function cartesian_product(q1: QueryResult, q2: QueryResult): QueryResult {
    const res: any[][] = new Array();
    q1.tuples.forEach(tuple1 => q2.tuples.forEach(tuple2 => res.push([...tuple1, ...tuple2])));
    const headVars = [...q1.head.terms, ...q2.head.terms]
    return new QueryResult(new HeadAtom(headVars), res);
}

// Returns only the columns represented by given variables
// Use qs varMap to retrieve the indices of each variable.
// if some variable is not present in q do not add a null column!
export function projection(variables: Array<string>, q: QueryResult): QueryResult {
    variables = variables.filter(v => q.varMap.has(v)); // ensure we project only existing columns!!
    const ordering: Map<number, number> = new Map() // orders the variables based on attribute index (key = attr_i and value = index in variables array)
    variables.forEach((v, v_idx) => {
        const q_indices = q.varMap.get(v);
        if (q_indices) {
            // the first one suffices as columns on other indices will contain the same value
            ordering.set(q_indices[0], v_idx);
        } // else the var does not occur in q
    });
    const res: any[][] = [];
    q.tuples.forEach(tuple => {
        const res_tuple: any[] = new Array(variables.length);
        tuple.forEach((attr, attr_i) => {
            const res_idx = ordering.get(attr_i);
            // 0 counts as falsy value in JS!!
            if (res_idx || res_idx == 0) {
                // add the attr at the corresponding index
                // this is to ensure that attributes appear in the same order as depicted by variables
                res_tuple[res_idx] = attr;
            }                
        });
        res.push(res_tuple);
    });
    return new QueryResult(new HeadAtom(variables.map(v => new VarTerm(v))), res);
}