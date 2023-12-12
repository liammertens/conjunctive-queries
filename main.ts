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
    
    // see test.ts for other tests
    const q1 = parser.parse(`Answer() :- Beers(u1, x, u2, 0.07, u3, u4, y, u5), Styles(u6, z, y), Categories(z, u7), Locations(u8, x, u9, u10, u11), Breweries(x, u12, u13, u14, u15, u16, u17, u18, u13, u14, u15).`);
    const q2 = parser.parse(`Answer(x, y, z) :- Breweries(w, x, 'Westmalle', u1, u2, u3, u4, u5, u6, u7, u8), Locations(u9, w, y, z, u10).`);
    const q3 = parser.parse(`Answer(x, y, z) :- Beers(u1, u2, z, u3, u4, u5, x, u6), Styles(u7, y, x), Categories(y, z).`);
    const q4 = parser.parse(`Answer(x, y, z, w) :- Beers(u1, v, x, 0.05, 18, u2, 'Vienna Lager', u3), Locations(u4, v, y, z, w).`);
    const q5 = parser.parse(`Answer(x, y, z, w) :- Beers(u1, x, u2, 0.06, u3, u4, y, u5), Styles(u6, z, y), Categories(z, w), Locations(u8, x, u9, u10, u11), Breweries(x, u12, u13, u14, u15, u16, u17, u18, u13, u14, u15).`);
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