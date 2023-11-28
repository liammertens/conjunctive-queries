import { Query } from "./DB/query";

const { Compiler } = require( "bnf" );
const { VarTerm, ConstTerm } = require("./DB/term")
const { Atom, HeadAtom } = require("./DB/atom")

// We have to write the parser in JS, as the TS bindings are not implemented by the developers...
// NOTE: allowJS must be set to true in tsconfig.json. outDir must be changed to a separate directory to avoid tsc overwriting this file when compiling
export class CQParser {
    parser;
    DB; // DB instance used to map relations to actual DB relations
    constructor(DB) {
        this.DB = DB
        this.parser = new Compiler()
        this.parser.AddLanguage(`
        <SYNTAX> ::= <query>
        <query> ::= <atom> <ANYWSP> ":-" <ANYWSP> <atom-list> "."
        <atom> ::= <relation> "(" <term-list> ")"
        <atom-list> ::= <atom> | <atom> "," <ANYWSP> <atom-list> | ""
        <term> ::= <constant> | <variable>
        <term-list> ::= <term> | <term> "," <ANYWSP> <term-list> | ""
        <constant> ::= <SQLITERAL> | <NUMBER>
        <variable> ::= <letters> *(<DIGITS>)
        <relation> ::= <capital> <letters>
        <capital> ::= "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I"|"J"|"K"|"L"|"M"|"N"|"O"|"P"|"Q"|"R"|"S"|"T"|"U"|"V"|"W"|"X"|"Y"|"Z"
        <letter> ::= "a"|"b"|"c"|"d"|"e"|"f"|"g"|"h"|"i"|"j"|"k"|"l"|"m"|"n"|"o"|"p"|"q"|"r"|"s"|"t"|"u"|"v"|"w"|"x"|"y"|"z"
        <letters> ::= <letter> <letters> | ""
        `, 'CQs')

        this.parser.SetRuleEvents({
            term(token, data) {
                // use relation as a key in the hashmap to associate atoms with their resp. terms
                // !! assumes no relation occurs 2x in the CQ body !!
                // we make use of the fact that the parser works left-to-right => variable order is unchanged
                const relation = token.Parent("atom").Child("relation").value.trim();
                const terms = data.terms.get(relation);
                if (terms) {
                    terms.push(token.value.trim());
                } else {
                    data.terms.set(relation, [token.value.trim()]);
                }
            }
        })
    }
    parse(cq) {
        // keep track of both relations and terms
        let parserSavedData = {
            terms: new Map(),
        }
        this.parser.ParseScript(cq, parserSavedData);
        
        let head = []
        const body = [];
        let firstIter = true;
        parserSavedData.terms.forEach((values, key) => {
            if (firstIter) { // first k,v pair will always be the head atom
                const terms = []
                values.forEach(v => {
                    if (v != '') {
                        terms.push(new VarTerm(v));
                    }
                });
                head = new HeadAtom(terms);
                firstIter = false;
            } else {
                // processing body atoms...
                const terms = []
                values.forEach(v => {
                    if (/^[0-9]*$/.test(v) | /^\d+\.\d+$/.test(v)) {
                        // v is a number constant => convert to number
                        terms.push(new ConstTerm(+v));
                    } else { // v is a string constant or a variable
                        if (v.charAt(0) == "'") {
                            // v is a string constant => slice such that inner quotes are removed
                            terms.push(new ConstTerm(v.slice(1, v.length-1)));
                        } else {
                            // v is a var.
                            terms.push(new VarTerm(v));
                        }
                    }
                })
                body.push(new Atom(this.DB.relations.get(key), terms));
            }
        })

        return new Query(head, body);
    }
}