export interface Term {
    val: string | number;
}

export class ConstTerm implements Term{
    val: string | number;
    constructor(t: string | number) { // string and number are the only datatypes prevalent in this DB
        this.val = t;
    }   
}

export class VarTerm implements Term {
    val: string;
    constructor(t: string) {
        this.val = t;
    }
}

export function isVar(v: any): v is VarTerm {
    return v instanceof VarTerm;
}
export function isConst(v: any): v is ConstTerm {
    return v instanceof ConstTerm;
}