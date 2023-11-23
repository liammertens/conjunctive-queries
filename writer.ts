import { stringify } from "csv";
import * as fs from "fs";

export class Writer {
    //private writer;
    columns: string[];
    stringifier;
    filestream;
    constructor(path: string) {
        this.columns = ['query_id', 'is_acyclic', 'bool_answer', 'attr_x_answer', 'attr_y_answer','attr_z_answer','attr_w_answer']
        this.stringifier = stringify({header:true, columns: this.columns});
        this.filestream = fs.createWriteStream(path);
        this.stringifier.pipe(this.filestream);
    }

    // pass array so we can compute query_id beforehand and we can handle the acyclic query exception in the main function
    writeResult(res: any[]) {
        this.stringifier.write(res);
    }
}