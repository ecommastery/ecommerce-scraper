import puppeteer from 'puppeteer';
import { WebhookClient } from 'discord.js';
import { writeFileSync } from 'fs';
import config from '../config.json';
import LooseObject from '../interface/LooseObject';

let { webhook_token, webhook_id, last_check, username, password } = config;
const uri = 'https://www.droptrends.site';

export default class Droptrends {

    public static sendWebhook = async (info: LooseObject) => {
        let webhook = new WebhookClient(webhook_id, webhook_token);

        let embed: LooseObject = {
            title: info.productName,
            thumbnail: {
                url: 'attachment://thumbnail.png'
            },
            author: {name: 'E-Commerce Mastery Premium Bot', icon_url: 'attachment://thumbnail.png'},
            color: 15119137,
            fields: [
                {
                    name: "Product Cost",
                    value: info.productCost,
                    inline: true
                }, 
                {
                    name: "Selling Price",
                    value: info.sellingPrice,
                    inline: true
                }, 
                {
                    name: "Margin Profit",
                    value: info.profitMargin,
                    inline: true
                },
                {
                    name: "Saturation Value",
                    value: info.saturationValue
                },
                {
                    name : "Product Images Download",
                    value: `[Download](${info.downloadUrl})`
                }
            ],
            image: { url: info.imageUrl } 
        };
    
        if (info.interests) {
            embed.fields.push({
                name: "Facebook Interests",
                value: info.interests
            });
        }
    
        if (info.facebookAd) {
            embed.fields.push({
                name: "Facebook Ad",
                value: `[Facebook Ad](${info.facebookAd})`
            });
        }
    
        if (info.aliExpressLink) {
            embed.fields.push({
                name: "Ali Express Link",
                value: `[Ali Express Link](${info.aliExpressLink})`
            });
        } 
    
        if (info.alternateAliExpressLink) {
            embed.fields.push({
                name: "Alternate Ali Express Link",
                value: `[Alternate Ali Express Link](${info.alternateAliExpressLink})`
            });
        }
    
        if (info.competitorStore) {
            embed.fields.push({
                name: "Competitor Store",
                value: `[Competitor's Store](${info.competitorStore})`
            });
        }
    
        if (info.productDescription) {
            let shortenedDesc = info.productDescription.slice(0, 200);
            embed.description = shortenedDesc == info.productDescription ? shortenedDesc : shortenedDesc + '...';
        }
    
        let webhook_obj = {
            embeds: [embed],
            files: [{
                attachment: './src/thumbnail.png',
                name: 'thumbnail.png'
            }]
        };
    
        await webhook.send(webhook_obj);
    
        webhook.destroy();
    }

    public static scrapeProduct = async (link: string, cookies: puppeteer.Protocol.Network.Cookie[]) => {
        let browser = await puppeteer.launch();
        let page = await browser.newPage();
        await page.setCookie(...cookies);
    
        await page.goto(link, { waitUntil: 'networkidle0' });
    
        let info: LooseObject = await page.evaluate(async () => {
            let productName = <string | null>document.querySelector('.header-title-div1>h2')!.innerText; 
            let selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div2';
            let productDescription = <string | null>document.querySelector(selector)!.innerText;
            let imageUrl = <string | null>document.querySelector('div.product-images-contaner>div>div>div.swiper-slide-active')!.style!.backgroundImage.replace(/url\("(.+)"\)/, '$1');
            let sellingPrice = <string | null>document.querySelector('b.product-informations-value-dark')!.innerText;
            let productCost = <string | null>document.querySelector('b.product-informations-value-green')!.innerText;
            let profitMargin = <string | null>document.querySelector('b.product-informations-value-red')!.innerText;
            selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div1 > div > div:nth-child(4) > b';
            let saturationValue = <string | null>document.querySelector(selector)!.innerText;
            let interests = <string | null> document.querySelector('li.targeting-interests > b')!.innerText;
    
            let downloadUrl
            let aliExpressLink;
            let alternateAliExpressLink;
            let promoVid;
    
            try {
                let onClickFunction: string = document.querySelector('#about > div.product-section-contaner.product-media > div.header-title > div > button')!.onclick.toString();
                downloadUrl = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
                
                onClickFunction = document.querySelector('div.swiper-slide-active.osus-influencer>div>div>button')!.onclick.toString();
                aliExpressLink = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
    
                try {
                    onClickFunction = document.querySelector('div.swiper-slide-next.osus-influencer>div>div>button')!.onclick.toString();
                    alternateAliExpressLink = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
                } catch {}            
            } catch {}
            
            try {
                let onClickFunction: string = document.querySelector('#about > div:nth-child(4) > div > div > button')!.onclick.toString();
                promoVid = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
            } catch {}
    
            let onClickFunction: string = document.querySelector('div.online-shops-contaner>div>button')!.onclick.toString();
            let competitorStore = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1'); 
            
            return { interests, downloadUrl, productName, imageUrl, sellingPrice, productCost, profitMargin, aliExpressLink, alternateAliExpressLink, competitorStore, promoVid, productDescription, saturationValue };
        });
    
        try {
            await page.click('button.view-ads');
            await page.click('button.view-ad-post');
    
            await page.waitForTimeout(15000);
    
            let [tab1, tab2, tab3] = await browser.pages();
            
            info.facebookAd = tab3.url().replace(/.+?next=(.+)/, "$1");
        } catch {}
    
        browser.close();
    
        return info;
    }

    public static getNewProducts = async (cookies: puppeteer.Protocol.Network.Cookie[]) => {
        let browser = await puppeteer.launch();
        let page = await browser.newPage();
        await page.setCookie(...cookies)

        await page.goto(uri, { waitUntil: 'networkidle0' });

        let products = await page.evaluate(({ last_check, uri }) => {
            let getUrl = (e: Element) => uri + '/view-product.php?pid=' + e.querySelector('.product-id')!.innerText;
            let isRecent = (e: Element) => (last_check <= e.querySelector('.product-perfix')!.innerText) && !!e.querySelector('.product-id');
            return Array.from(document.querySelectorAll('.li-item')).filter(isRecent).map(getUrl);
        }, { last_check, uri });  

        browser.close();

        return products;
    }

    public static login = async () => {
        let browser = await puppeteer.launch();
        let page = await browser.newPage();

        await page.goto(uri + '/login.php', { waitUntil: 'networkidle0' });

        await page.type('#username', username);
        await page.type('#password', password);
        await page.click('input[type="submit"]');

        await page.waitForSelector('body > nav > a:nth-child(10) > i');

        let cookies = await page.cookies();

        browser.close();

        return cookies;
    }

    public static run = async () => {
        let cookies = await Droptrends.login();
        let new_products = await Droptrends.getNewProducts(cookies);

        for (let product of new_products) {
            try {
                let info = await Droptrends.scrapeProduct(product, cookies);
                await Droptrends.sendWebhook(info);
            } catch {};   
        };

        let currentDate = (new Date()).toISOString().replace("T", " ").replace(/(\..+)/, '');

        let config = { webhook_id, webhook_token, last_check: currentDate, username, password };
        writeFileSync('./src/config.json', JSON.stringify(config));
    }
}