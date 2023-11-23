import { Relation } from "./relation";
import { Term, VarTerm, isVar } from "./term";

export class Atom {
    relation: Relation; // if undefined, atom should be a head atom of a query
    terms: Array<Term>;
    variables: Set<string>;
    constructor(relation: Relation, terms: Array<Term>) {
        if (relation.table.numCols != terms.length) {
            throw new Error('Relation arity mismatch: Expected ' + relation.table.numCols + ' terms. Got ' + terms.length);
        }
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

export class HeadAtom {
    terms: Array<VarTerm>; // Do not allow for constants in atom heads
    constructor(terms: Array<VarTerm>) {
        this.terms = terms;
    }
}