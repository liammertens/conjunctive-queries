import { Atom, HeadAtom } from "./atom";
import { Term, VarTerm, isVar } from "./term";

export class Query {
    head: HeadAtom;
    body: Array<Atom>;
    constructor(head: HeadAtom, body: Array<Atom>) {
        this.head = head;
        this.body = body;
    }

    // non-optimized compute for this query
    // to be used to compute intermediary results (qs and Qs)
    compute(): QueryResult {
        const res: Array<Array<any>> = new Array();

        if (this.body.length == 1) { 
            // simple query => no joins needed
            // Answer(y) :- R(x1, x2, ..., xi)
            // y = {x1, x2, ...}
            const R = this.body[0].relation;
            const terms: Term[] = this.body[0].terms;
            const y = this.head.terms; // use to know what result should look like
            const schema = R.table.schema;
            for (const tuple of R.table) {
                const varMap = new Map<string, any>(); // keep track of valuations
                for (let i = 0; i < schema.fields.length; i++) {
                    const xi: Term = terms[i]; // get the corresponding VarTerm
                    const attr_i = tuple[schema.fields[i].name]; // value of attribute i
                    if (isVar(xi)) {
                        const v = varMap.get(xi.val);
                        if (v) { // a valuation for xi already exists
                            if (v !== attr_i) { // valuation is inconsistent
                                break; // skip this tuple
                            }
                        } else { // add valuation for xi
                            varMap.set(xi.val, attr_i);
                        }
                    } else { // xi is a constant
                        if (xi.val !== attr_i) {
                            break;
                        }
                    }
                    if (i == (schema.fields.length - 1)) {
                        // inner loop terminates => a consistent valuation exists for this tuple
                        // TODO: find a solution for boolean queries (eg. no terms in head)

                        // use array instead of set => some columns contain the same value (eg. style/style2 in beers relation). Might cause unwanted errors
                        // nested sets are also not supported...
                        // BIG performance penalty when we want to compute intersections....
                        const intermediate_res = new Array(y.length); 
                        y.forEach((t: VarTerm, idx, rest) => {
                            intermediate_res[idx] = varMap.get(t.val); // this is always defined by definition of the loop
                        });
                        if (intermediate_res.length > 0) {
                            // only add non-empty results to avoid nesting empty arrays (in case of boolean query)
                            res.push(intermediate_res);
                        }
                        
                    }
                }
            }
        } else if (this.body.length > 1) {
            // This case appears when several terms share exactly the same set of variables eg. Answer(x1, x2) :- R1(x1,x2), R2(x2,x1), ...
            // TODO: implement this
            // compute pair-wise join of all relations in the body and proceed as above => O(m.n) (m = |rel a|, n = |rel b|)
            // create index for largest relation for optimal performance => O(n.log(m)) (best if m>n)
            // see also: slides chpt.2, p.7
            // index on attributes that are represented by common variables
            // Use a hashtable for indexing, because data is fixed (during query runtime), so the added performance for insertion/deletion that B+-trees would give is diminishable

            // idea: join first two relations and recursively join the rest in the same manner
        }

        return new QueryResult(this.head, res);
    }
}

/*
Datatype that represents query results.
Keep track of the variables and their positions within tuples in order to join more efficiently
*/
export class QueryResult {
    head: HeadAtom;
    tuples: Array<Array<any>>;
    variables: Set<string>;
    varMap: Map<string, Array<number>>; // maps variables to the indices within the resulting tuples
    constructor(head: HeadAtom, tuples: Array<Array<any>>) {
        this.head = head;
        this.tuples = tuples;
        this.varMap = new Map();
        this.variables = new Set(head.terms.map(t => t.val));
        
        head.terms.forEach((t: Term, idx, rest) => {
            if (isVar(t)) {
                const var_indices = this.varMap.get(t.val)
                if (var_indices) { // variable has already an occurence in head
                    var_indices.push(idx);
                } else { // add entry in map
                    this.varMap.set(t.val, [idx]);
                }
            }
        });
    }
}