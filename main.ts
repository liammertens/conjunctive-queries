import { Relation } from './DB/relation';
import { Query } from './DB/query';
import { Atom, HeadAtom } from './DB/atom';
import { ConstTerm, Term, VarTerm } from './DB/term';
import { GYO, ear } from './algos/GYO';
import { yannakakis } from './algos/yannakakis';
import { CQParser } from './parser';
import { DataBase } from './DB/database';

/*
    In order to run program run command: 
        - npx ts-node main.ts
    This requires the ts-node package => do npm install first.
*/
function main(): void {
    const DB = new DataBase(); // initialize database instance
    const parser = new CQParser(DB);
    const d = parser.parse(`Answer(x, y, z) :- Breweries(v, x, 'Westmalle', u1, u2, u3, u4, u5, u6, u7, u8), Locations(v, u8, y, z, u9).`)
    console.log(d)
    
    const y = yannakakis(d);

    console.log(y);

}

main()