import { Relation } from "./relation";
import { Term } from "./term";

export class Atom {
    relation: Relation | null;
    terms: Array<Term>;
    constructor(relation: Relation | null, terms: Array<Term>) {
        this.relation = relation;
        this.terms = terms;
    }
}