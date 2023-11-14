import { Relation } from "./relation";
import { Term, isVar } from "./term";

export class Atom {
    relation: Relation | null;
    terms: Array<Term>;
    variables: Set<string>;
    constructor(relation: Relation | null, terms: Array<Term>) {
        this.relation = relation;
        this.terms = terms;
        // keep track of all variables
        // the set variables is re-used during hypergraph creation, GYO (and thus in the join tree)
        this.variables = new Set<string>;
        for(const t of this.terms) {
            if (isVar(t)) {
                this.variables.add(t.val)
            }
        }
    }
}