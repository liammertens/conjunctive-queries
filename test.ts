import { DataBase } from "./DB/database";
import { QueryResult } from "./DB/query";
import { yannakakis } from "./algos/yannakakis";
import { CQParser } from "./parser";

const DB = new DataBase();
const parser = new CQParser(DB);
//console.log(DB.relations.get('Breweries')?.table.toArray()[4]);


// find the name and location of breweries located in Westmalle (maybe this should be q2?)
const q1 = parser.parse(`Answer(x, y, z) :- Breweries(v, x, a1, a2, 'Westmalle', u1, u2, u3, u4, u5, u6), Locations(v, u9, y, z, u10).`);

// get the name of all American IPA style beers brewed in Belgium
const q2 = parser.parse(`Answer(beer) :- Beers(x, brewid, beer, v, y, z, 'American IPA', w), Breweries(brewid, x2, x3, x4, x5, x6, x7, 'Belgium', y2, y3, y4).`);

// get the name, brewery and brewery coordinates of all beers brewed in the province of Antwerp
const q3 = parser.parse(`Answer(beer, brewery, lat, long) :- Beers(z1, brewid, beer, z2, z3, z4, z5, z6), Breweries(brewid, brewery, x3, x4, x5, 'Antwerpen', x6, y2, y3, y4, y5), Locations(u1, brewid, lat, long, u2).`);

console.log('Locations of all breweries located in Westmalle: ', (yannakakis(q1) as QueryResult).tuples);
console.log('Name of all American IPA style beers brewed in Belgium: ', (yannakakis(q2) as QueryResult).tuples);
console.log('Name, brewery + location of all beers brewed in the province of Antwerp: ', (yannakakis(q3) as QueryResult).tuples);
