import Droptrends from "./scrapers/Droptrends";
import puppeteer from "puppeteer";
import database from "./util/database";
import { MessageEmbed, WebhookClient } from "discord.js";

let getWebhook = async () => { 
    const id: string =  await (await database.ref('settings/webhookId').get()).val();
    const token: string = await (await database.ref('settings/webhookId').get()).val();

    return { id, token };
};

let getDemoWebhook = async () => {
    const demoId: string =  await (await database.ref('settings/demoWebhookId').get()).val();
    const demoToken: string = await (await database.ref('settings/demoWebhookId').get()).val();

    return { demoId, demoToken };
};

let main = async () => {
    const browser = await puppeteer.launch();
    const droptrends = new Droptrends(database, browser);
    const { id, token } = await getWebhook();
    const { demoId, demoToken } = await getDemoWebhook();
    const webhook = new WebhookClient(id, token);
    const demoWebhook = new WebhookClient(demoId, demoToken);
    let products: MessageEmbed[] = [];

    products.push(...await droptrends.run());

    await browser.close();

    if (products.length) {
        await webhook.send(products, {
            files: [{
                attachment: './src/icons/thumbnail.png',
                name: 'thumbnail.png'
            }]
        });

        const demoProduct = await droptrends.demo();

        if (demoProduct) {
            await demoWebhook.send(demoProduct, {
                files: [{
                    attachment: './src/icons/thumbnail.png',
                    name: 'thumbnail.png'
                }]
            });
        }      

    }
    
    webhook.destroy();
}

main();