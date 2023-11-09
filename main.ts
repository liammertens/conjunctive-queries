import { DataType, Dictionary, Type, makeData } from 'apache-arrow';
import { Relation } from './DB/relation';
import { Query } from './DB/query';
import { Atom } from './DB/atom';
import { Variable } from './DB/variable';
import { Hypergraph } from './algos/hypergraph';
import { Term } from './DB/term';
import { ear } from './algos/GYO';

/*
    In order to run program run command: 
        - npx ts-node main.ts
    This requires the ts-node package => do npm install first.
*/
function main(): void {
    const beers = new Relation('data/beers.csv');

    //console.log(DataType.isFloat(beers.table.schema.fields[0].type)); // should yield true => type is checked using type.typeId comparing it to the Type enum
    //console.log(beers.table.schema);
    //console.log(beers.table.toArray()[0]['beer']);

    const breweries = new Relation('data/breweries.csv');
    const categories = new Relation('data/categories.csv');
    const locations = new Relation('data/locations.csv');
    const styles = new Relation('data/styles.csv');


    const ex_query = new Query(new Atom(null, []), 
        [new Atom(beers, 
            [
            new Term(new Variable('beer_id')),
            new Term(new Variable('brew_id')),
            new Term(new Variable('beer')),
            new Term(new Variable('abv')),
            new Term(new Variable('ibu')),
            new Term(new Variable('ounces')),
            new Term(new Variable('style')),
            new Term(new Variable('style2'))
            ]),
        new Atom(styles,
            [
            new Term(new Variable('style_id')),
            new Term(new Variable('cat_id')),
            new Term(new Variable('style4'))
            ]),
        new Atom(categories,
            [
            new Term(new Variable('cat_id')),
            new Term('Belgian and French Ale')
            ])]);
    
    const hg = new Hypergraph(ex_query);
    //console.log(hg.edges)
    const e = ear([...hg.edges[1]], new Array(hg.edges[0], hg.edges[2]), new Set<string>()); // should return categories as witness

    console.log(e);

}

main()