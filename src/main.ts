import Droptrends from "./Droptrends";
import puppeteer from "puppeteer";
import database from "./common/database/database";
import { App } from "./app";

let main = async () => {
    const browser = await puppeteer.launch();

    const app = new App(
        [new Droptrends(browser, database)], 
        browser, Object.values(await (await database.ref('vip').get()).val())
    )
    
    await app.start();

    await browser.close();
    database.goOffline();
}

main();