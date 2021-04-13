import { MessageEmbed, WebhookClient } from "discord.js";
import puppeteer from "puppeteer";
import { Scraper } from "./common/classes/scraper";
import IVip from "./common/interfaces/vip.interface";

export class App {

    constructor (private scrapers: Scraper[], private browser: puppeteer.Browser, private vips: IVip[]) {}

    async start() {
        for (const scraper of this.scrapers) {
            const products = await scraper.run();
            //const demoProduct = await scraper.demo();

            await this.sendProducts(products);
            //await this.sendDemoProduct(demoProduct);
        }
    }

    async sendProducts(products: MessageEmbed[]) {
        if (products.length) {
            for (let vip of this.vips) {
                const webhook = new WebhookClient(vip.webhookId, vip.webhookToken);
                
                for (const product of products) {
                    await webhook.send({
                        embeds: [product],
                        files: [{
                            attachment: './src/icons/thumbnail.png',
                            name: 'thumbnail.png'
                        }]
                    });
                }
        
                webhook.destroy();
            }
        }
    }

    async sendDemoProduct(product: MessageEmbed | null) {
        if (product) {
            for (let vip of this.vips) {
                const webhook = new WebhookClient(vip.demoWebhookId, vip.demoWebhookToken);
    
                await webhook.send({
                    embeds: [product],
                    files: [{
                        attachment: './src/icons/thumbnail.png',
                        name: 'thumbnail.png'
                    }]
                });
        
                webhook.destroy();
            }
        }
    }

}