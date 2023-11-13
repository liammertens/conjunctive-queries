import { Variable } from "./variable";

export class Term {
    val: Variable | string | number;
    constructor(t: Variable | string | number) { // string and number are the only types prevalent in this DB
        this.val = t;
    }   
}