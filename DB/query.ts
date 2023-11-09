import { Atom } from "./atom";

export class Query {
    head: Atom;
    body: Array<Atom>;
    constructor(head: Atom, body: Array<Atom>) { //TODO: consider not using Atom for head....
        this.head = head;
        this.body = body;
    }

    compute() {
        // TODO: implement this
    }
}