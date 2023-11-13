// introduce distinct type to distinguish between variables and string constants
export class Variable {
    symbol: string;
    constructor(symbol: string) {
        this.symbol = symbol;
    }

    eq(other: any): boolean {
        return other instanceof Variable && this.symbol == other.symbol;
    }
}
export function isVar(v: any): v is Variable { // add v is ... for type guards
    return v instanceof Variable;
}