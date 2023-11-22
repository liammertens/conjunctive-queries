import { Relation } from "./relation";

export class DataBase {
    relations: Map<string, Relation>;
    constructor() {
        const beers = new Relation('data/beers.csv');
        const breweries = new Relation('data/breweries.csv');
        const categories = new Relation('data/categories.csv');
        const locations = new Relation('data/locations.csv');
        const styles = new Relation('data/styles.csv');
        this.relations = new Map([
            ['Beers', beers],
            ['Breweries', breweries],
            ['Categories', categories],
            ['Locations', locations],
            ['Styles', styles]
        ]);
    }
}