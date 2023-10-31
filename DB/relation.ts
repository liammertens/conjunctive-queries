import * as fs from "fs";
import * as path from "path";
import { parse } from 'csv-parse/sync'; // use the sync package to prevent use of callbacks
import { Table, tableFromJSON } from 'apache-arrow';

/*
Pass csv file path as constructor argument to create table for the relation.
*/
export class Relation {
    table: Table;
    
    constructor(pathTocsv: string) {
        const filePath = path.resolve(pathTocsv);
        const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

        this.table = tableFromJSON(parse(fileContent, {
            delimiter: ',',
            columns: true, // discover column names on first csv line
            cast: true, // try to convert values to native types
            // TODO: cast integers to int instead of floats
            // NOTE: Strings are converted to dictionary types for efficiency (https://arrow.apache.org/docs/js/index.html#md:string-vectors)
        }));
    }   
}

