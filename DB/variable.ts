import { DataType } from "apache-arrow";

export class Variable {
    symbol: string;
    value: DataType | null;
    constructor(symbol: string, value: null | DataType) {
        this.symbol = symbol;
        this.value = value;
    }
}