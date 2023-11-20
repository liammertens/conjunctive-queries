import { HeadAtom } from "./atom";
import { QueryResult } from "./query";
import { VarTerm } from "./term";

/*
joins queries q1 and q2:
    - All tuples of q1 x q2 are kept if they have a consistent valuation for their variables.
    - Build an index for the largest relation (for common variables only)
    - compute join
    - return querresult with head = (head(q1) + head(q2))
*/
export function join(q1: QueryResult, q2: QueryResult): QueryResult {
    let index: Map<any, any[][]>;
    let swappedQueries = false;
    if (q1.tuples.length <= q2.tuples.length) {
        // build index for q2
        index = createIndex(q1, q2);
    } else {
        // build index for q1 and swap q1 with q2 (avoid code duplication)
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
        let q2_tuples: any[][] = [];
        for (let attr_i = 0; attr_i < tuple.length; attr_i++) {
            if (shared_vars_indices.has(attr_i)) {
                // check if the attr represented by some common variable has the same value in some tuple in q2
                const attr = tuple[attr_i]
                const matching_tuples = index.get(attr);
                if (matching_tuples) {
                    if (q2_tuples.length > 0) {
                        // we need to keep tuples of q2 that are consistent for ALL variables
                        q2_tuples = intersect([q2_tuples, matching_tuples]);
                    } else {
                        q2_tuples = matching_tuples;
                    }
                } else {
                    q2_tuples = [];
                    break;
                }
            }
        }
        if (swappedQueries) {
            // we have to switch around the result
            q2_tuples.forEach(q2_tuple => res.push([...q2_tuple, ...tuple]));
        } else {
            q2_tuples.forEach(q2_tuple => res.push([...tuple, ...q2_tuple]));
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
Index the columns of the largest set of tuples that are represented by a variable also occuring in the smaller set.

We use hash indexing because we use the index to retrieve tuples that have exact matching attribute values.
The improvement of B-trees for range queries is thus unnecessary.
Insertion and lookup can be done in O(1) (and rehashing is pretty uncommon given that the dataset in our case is fixed)

index maps attribute values to tuples
*/
export function createIndex(q1: QueryResult, q2: QueryResult): Map<any, Array<Array<any>>> {
    const cols_to_idx = new Set<number>() // keep track of columns (of tuples in q2) that need an index
    q1.varMap.forEach((indices: number[], var_name: string) => {
        const q2_var_indices = q2.varMap.get(var_name); // retrieve indices within tuples of q2 for common var var_name
        if (q2_var_indices) { // the same var occurs also in q2
            // add column of occurence of var in q2 to cols_to_idx
            q2_var_indices.forEach(idx => cols_to_idx.add(idx));
        }
    })
    // create index for each column in cols_to_idx
    // keys are attribute values and values are tuples of q2
    const index = new Map<any, Array<Array<any>>>;
    q2.tuples.forEach(tuple => {
        for (let attr_i = 0; attr_i < tuple.length; attr_i++) {
            if (cols_to_idx.has(attr_i)) {
                // index this tuple on attr value
                const attr = tuple[attr_i]
                const index_entry = index.get(attr);
                if (index_entry && index_entry[index_entry.length-1] != tuple) {
                    // if there is already an entry and this tuple was not added before!
                    // (eg. [a, b, a] could be added twice, because the tuple has the same attr value for multiple attributes)
                    // only in the case that columns 0 and 2 are columns represented by the same shared variable also occuring in q1
                    // this could be the case for the beers table with style and style2 for example.
                    index_entry.push(tuple);
                } else {
                    index.set(attr, [tuple]);
                }                
            }
        }            
    });
    return index;
}

/*
semijoin(q1, q2) = keep all tuples of q1 where the valuation its variables that are also in q2 are consistent with q2.

- Create index for attributes represented by shared variables of q1 and q2
- for each tuple of q1:
    - for each attribute of the tuple:
        - find associated variable for that attribute
        - use prev, made index to look up valuation (= tuples of q2) for this variable
        - add found tuples (if any) to a list
        => this list contains all tuples of q2 that have some consistent valuation
    - compute intersection of all tuples in the list => if NOT empty, add the q1 tuple to the semijoin result
        - tuples of q1 might contain multiple vars occuring in tuples of q2
            => ensure consistency for all tuples
*/
export function semijoin(q1: QueryResult, q2: QueryResult) {
    if (q1.tuples.length > 0 && q2.tuples.length > 0) {
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
        
        // make index for q2
        const index = createIndex(q1, q2);

        const res: Array<Array<any>> = [];
        q1.tuples.forEach(tuple => {
            let consistent_tuples: Array<Array<any>> = [];
            for (let attr_i = 0; attr_i < tuple.length; attr_i++) {
                // check if for this attribute value there exists a tuple in q2 that has this same value
                // attr is represented by some common variable between q1 and q2
                // if attr is not represented by some common variable, we do not need to compare it to any attr of q2 (as imposed by our semijoin condition)
                // if attr has no matching tuples in q2, but is represented by some common var, then this tuple is inconsistent!!! => only check attributes represented by shared vars...
                if (shared_vars_indices.has(attr_i)) {
                    const attr = tuple[attr_i];
                    const matching_tuples: Array<Array<any>> | undefined = index.get(attr);
                    if (matching_tuples) {
                        // this tuple of q1 has some consistent valuation(s) for attr
                        // q2_tuples contains all tuples of q2 that are consistent for 1 shared variable from q1
                        // if we want to have those that are consistent for all, we need to compute the intersect of all consistent tuples  
                        // compute intersect at every step to allow for early termination
                        if (consistent_tuples.length > 0) {
                            consistent_tuples = intersect([consistent_tuples, matching_tuples]);
                        } else {
                            consistent_tuples = matching_tuples;
                        }
                        // perform another length check for early termination if intersect is empty (=> all consequent intersects will be too)
                        if (consistent_tuples.length == 0) {
                            break;
                        }
                    } else {
                        // Impossible to find any consistent tuple in q2
                        consistent_tuples = [];
                        break;
                    }
                }
                
            }
            if (consistent_tuples.length > 0) {
                // tuple (of q1) is consistent with some tuple in q2
                res.push(tuple);
            }
        });
        return new QueryResult(q1.head, res)
    } else {
        // return empty set
        return new QueryResult(q1.head, []);
    }    
}

/*
Compute the intersection of all sets (arrays) of tuples in s: 
    - s = [s1, s2, s3,...]
    - compute s1 ^ s2 ^ s3 ^ ...
    - left-to-right computation
s is an array of arrays of tuples (query results are arrays, not sets)

By converting tuples to strings, we can keep the complexity linear, instead of quadratic if we were to use arrays

Returns an array containing all tuples gained from the intersect
*/
export function intersect(s: Array<Array<Array<any>>>): Array<Array<any>> {
    if (s.length > 1) {
        // add a guard to check for empty tuple sets in s
        // can prevent useless stringify/filter operations early
        for (const tuples of s) {
            if (tuples.length == 0) {
                return new Array();
            }
        }

        const tuple_sets: Array<Set<string>> = new Array(s.length);
        for (let i = 0; i < s.length; i++) {
            // convert tuples to strings in order to use set membership
            tuple_sets[i] = new Set(s[i].map(tuple => JSON.stringify(tuple)));
        }

        let res: Array<string> = [...tuple_sets[0]];
        for (let i = 1; i<tuple_sets.length; i++) {
            res = res.filter(tuple => tuple_sets[i].has(tuple));
            if (res.length == 0) {
                // intersect is empty => all following intersects will be too
                // terminate early
                break;
            }
        }
        return res.map(str => JSON.parse(str)); // parse the strings back to arrays
    } else {
        // intersect with yourself = yourself
        return s[0];
    }
}

export function cartesian_product(s1: any[][], s2: any[][]): any[][] {
    const res: any[][] = new Array();
    s1.forEach(tuple1 => s2.forEach(tuple2 => res.push([...tuple1, ...tuple2])));
    return res;
}

// Returns only the columns represented by given variables
// Use qs varMap to retrieve the indices of each variable.
export function projection(variables: Array<string>, q: QueryResult): QueryResult {
    const indices: Set<number> = new Set()
    const ordering: Map<number, number> = new Map // orders the variables based in attribute index (key = attr_i and value is index in variables array)
    variables.forEach((v, v_idx) => {
        const q_indices = q.varMap.get(v);
        if (q_indices) {
            // only the first one is okay as columns on other indices will contain the same value
            indices.add(q_indices[0])
            ordering.set(q_indices[0], v_idx);
        } // else the var does not occur in q
    });
    const res: any[][] = [];
    q.tuples.forEach(tuple => {
        const res_tuple: any[] = new Array(variables.length);
        tuple.forEach((attr, attr_i) => {
            if (indices.has(attr_i)) {
                const res_idx = ordering.get(attr_i);
                if (res_idx) {
                    // add the attr at the corresponding index
                    // this is to ensure that attributes appear in the same order as depicted by variables
                    res_tuple[res_idx] = attr;
                }                
            }
        });
        res.push(res_tuple);
    });
    return new QueryResult(new HeadAtom(variables.map(v => new VarTerm(v))), res);
}