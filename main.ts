import { DataType, Dictionary, Type, makeData } from 'apache-arrow';
import { Relation } from './DB/relation';

/*
    In order to run program run command: npx ts-node main.ts
    This requires the ts-node package. otherwise compile to js first using tsc.
*/
function main(): void {
    const beers = new Relation('data/beers.csv');

    console.log(DataType.isFloat(beers.table.schema.fields[0].type)); // should yield true => type is checked using type.typeId comparing it to the Type enum
    console.log(beers.table.schema.fields[0].type);
    /*
    const breweries = new Relation('data/breweries.csv');
    const categories = new Relation('data/categories.csv');
    const locations = new Relation('data/locations.csv');
    const styles = new Relation('data/styles.csv');
    */


}

main()