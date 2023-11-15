import { Atom } from "./atom";
import { Term, isVar } from "./term";

export class Query {
    head: Atom;
    body: Array<Atom>;
    constructor(head: Atom, body: Array<Atom>) { //TODO: consider not using Atom for head....
        this.head = head;
        this.body = body;
    }

    // non-optimized compute for this query
    // to be used to compute intermediary results (qs and Qs)
    compute(): Array<any> {
        const res: Array<Array<any>> = new Array();

        // Answer(y) :- R(x1, x2, ..., xi)
        // y = {x1, x2, ...}
        if (this.body.length == 1) { // simple query => no joins needed
            const R = this.body[0].relation;
            const terms: Term[] = this.body[0].terms;
            const y = this.head.terms; // use to know what result should look like
            if (R) { // to bypass undefined check on R...
                const schema = R.table.schema;
                for (const tuple of R.table.toArray()) {
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
                            const intermediate_res = new Array();
                            y.forEach((t: Term, idx, rest) => {
                                if (isVar(t)) {
                                    intermediate_res[idx] = varMap.get(t.val); // this is always defined by definition of the loop
                                } else {
                                    // head atom contains a ConstTerm (idk if this is even possible...)
                                    intermediate_res[idx] = t.val;
                                }
                            });
                            res.push(intermediate_res);
                        }
                    }
                }
            }
        } else {
            // TODO: implement this
            // compute cartesian product of all relations in the body and proceed as above 
        }

        return res;
    }
}