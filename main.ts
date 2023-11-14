import { DataType, Dictionary, Type, makeData } from 'apache-arrow';
import { Relation } from './DB/relation';
import { Query } from './DB/query';
import { Atom } from './DB/atom';
import { Hypergraph, eqSet } from './algos/hypergraph';
import { ConstTerm, Term, VarTerm } from './DB/term';
import { GYO, ear } from './algos/GYO';

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
                    new VarTerm('beer_id'),
                    new VarTerm('brew_id'),
                    new VarTerm('beer'),
                    new VarTerm('abv'),
                    new VarTerm('ibu'),
                    new VarTerm('ounces'),
                    new VarTerm('style'),
                    new VarTerm('style2')
                ]),
            new Atom(styles,
                [
                    new VarTerm('style_id'),
                    new VarTerm('cat_id'),
                    new VarTerm('style')
                ]),
            new Atom(categories,
                [
                    new VarTerm('cat_id'),
                    new ConstTerm('Belgian and French Ale')
                ])]);
    
    // exercises chpt.2 E5 b.)
    // only test this query using GYO, do not compute as relations have wrong arity
    
    const ex_query_cyclic = new Query(new Atom(null, []),
        [new Atom(beers,
            [
                new VarTerm('x'),
                new VarTerm('z')
            ]),
        new Atom(beers,
            [
                new VarTerm('x'),
                new VarTerm('y'),
                new VarTerm('n'),
                new VarTerm('w'),
                new VarTerm('r')
            ]),
        new Atom(beers,
            [
                new VarTerm('r'),
                new VarTerm('w')
            ]),
        new Atom(beers,
            [
                new VarTerm('z'),
                new VarTerm('v')
            ]),
        new Atom(beers,
            [
                new VarTerm('v'),
                new VarTerm('n')
            ])])
    
    //const c = GYO(ex_query_cyclic);
    //console.log(c?.nodes[0]); // (x, z) is taken as ear => incorrect

    const t = GYO(ex_query);

    console.log(t?.nodes[0].parent);

}

main()