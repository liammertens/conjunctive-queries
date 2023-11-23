import { yannakakis } from './algos/yannakakis';
import { CQParser } from './parser';
import { DataBase } from './DB/database';
import { QueryResult } from './DB/query';
import { Writer } from './writer';

/*
    In order to run program run command: 
        - npx ts-node main.ts
    This requires the ts-node package => do npm install first.
*/
function main(): void {
    const DB = new DataBase(); // initialize database instance
    const parser = new CQParser(DB);
    // find the name and location of breweries located in Westmalle (maybe this should be q2?)
    const q = parser.parse(`Answer(x, y, z) :- Breweries(v, x, a1, a2, 'Westmalle', u1, u2, u3, u4, u5, u6, u7, u8), Locations(v, u9, y, z, u10).`);
    
    const q1 = parser.parse(`Answer() :- Locations(u6, v, u7, u8, z), Breweries(v, y, u7, u8, u9, u10, u11, u12, u13, u14, u15), Beers(u1, v, x, 0.07, u2, u3, u4, s, u5), Styles(u16, c, s), Categories(c, w).`);
    const q2 = parser.parse(`Answer(x, y, z) :- Breweries(v, x, 'Westmalle', u1, u2, u3, u4, u5, u6, u7, u8), Locations(v, u8, y, z, u9).`);
    const q3 = parser.parse(`Answer(x, y, z) :- Beers(u1, u2, x, u3, u4, u5, u6, x, z), Styles(u7, y, x), Categories(y, z).`);
    const q4 = parser.parse(`Answer(x, y, z, w) :- Beers(u1, v, x, 0.05, 18, u5, 'Vienna Lager', u6), Locations(u7, v, y, z, w).`);
    const q5 = parser.parse(`Answer(x, y, z, w) :- Locations(u6, v, u7, u8, z), Breweries(v, y, u7, u8, u9, u10, u11, u12, u13, u14, u15), Beers(u1, v, x, 0.06, u2, u3, u4, s, u5), Styles(u16, c, s), Categories(c, w).`);
    const test_queries = [q1,q2,q3,q4,q5];

    const w = new Writer('./output.csv');
    test_queries.forEach((q, idx) => {
        try {
            const res = yannakakis(q)
            if (typeof res == 'boolean') {
                w.writeResult([idx+1, 1, 1, null, null, null, null]);
            } else if (res instanceof QueryResult) {
                const xs = res.tuples.flatMap(tuple => tuple.filter((attr, idx) => res.varMap.get('x')?.includes(idx)));
                const ys = res.tuples.flatMap(tuple => tuple.filter((attr, idx) => res.varMap.get('y')?.includes(idx)));
                const zs = res.tuples.flatMap(tuple => tuple.filter((attr, idx) => res.varMap.get('z')?.includes(idx)));
                const ws = res.tuples.flatMap(tuple => tuple.filter((attr, idx) => res.varMap.get('w')?.includes(idx)));
                // write null only if var does not occur in head.
                w.writeResult([idx+1, 1, null, (xs.length>0||res.varMap.has('x'))?xs:null, (ys.length>0||res.varMap.has('y'))?ys:null,
                    (zs.length>0||res.varMap.has('z'))?zs:null, (ws.length>0||res.varMap.has('w'))?ws:null]);
            }            
        } catch (error) {
            // if error => acyclic query
            w.writeResult([idx+1, 0, null, null, null, null, null]);
        }
    });
    
}

main()