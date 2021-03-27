import puppeteer from 'puppeteer';
import { MessageEmbed } from 'discord.js';
import config from '../../util/config';
import firebase from 'firebase'
import LooseObject from '../../interfaces/LooseObject';

export default class Droptrends {

    private database: firebase.database.Database;
    private uri: string = 'https://www.droptrends.site';
    private browser: puppeteer.Browser;

    public constructor(database: firebase.database.Database, browser: puppeteer.Browser) {
        this.database = database;
        this.browser = browser;
    }

    private getEmbed = async (info: LooseObject): Promise<MessageEmbed> => {
        let embed = new MessageEmbed()
            .setTitle(info.productName)
            .setThumbnail('attachment://thumbnail.png')
            .setAuthor('E-Commerce Mastery Premium Bot', 'attachment://thumbnail.png')
            .setColor(15119137)
            .addFields([
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
            ])
            .setImage(info.imageUrl);
    
        if (info.interests) {
            embed.addField("Facebook Interests", info.interests);
        }
    
        if (info.facebookAd) {
            embed.addField("Facebook Ad", `[Facebook Ad](${info.facebookAd})`);
        }
    
        if (info.aliExpressLink) {
            embed.addField("Ali Express Link", `[Ali Express Link](${info.aliExpressLink})`);
        } 
    
        if (info.alternateAliExpressLink) {
            embed.addField("Alternate Ali Express Link", `[Alternate Ali Express Link](${info.alternateAliExpressLink})`);
        }
    
        if (info.competitorStore) {
            embed.addField("Competitor Store", `[Competitor's Store](${info.competitorStore})`);
        }
    
        if (info.productDescription) {
            let shortenedDesc = info.productDescription.slice(0, 200);
            embed.setDescription(shortenedDesc == info.productDescription ? shortenedDesc : shortenedDesc + '...');
        }
    
        return embed;
    }

    private scrapeProduct = async (link: string, cookies?: puppeteer.Protocol.Network.Cookie[]) => {
        let browser = await puppeteer.launch();
        let page = await browser.newPage();
        if (cookies) {
            await page.setCookie(...cookies);
        }
    
        await page.goto(link, { waitUntil: 'networkidle0' });
    
        let info: LooseObject = await page.evaluate(async () => {
            let productName = <string | null>document.querySelector('.header-title-div1>h2')!.textContent; 
            let selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div2';
            let productDescription = <string | null>document.querySelector(selector)!.textContent;
            let imageUrl = <string | null>document.querySelector('div.product-images-contaner>div>div>div.swiper-slide-active')?.getAttribute('style')?.replace(/url\("(.+)"\)/, '$1');
            let sellingPrice = <string | null>document.querySelector('b.product-informations-value-dark')?.textContent;
            let productCost = <string | null>document.querySelector('b.product-informations-value-green')?.textContent;
            let profitMargin = <string | null>document.querySelector('b.product-informations-value-red')?.textContent;
            selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div1 > div > div:nth-child(4) > b';
            let saturationValue = <string | null>document.querySelector(selector)?.textContent;
            let interests = <string | null> document.querySelector('li.targeting-interests > b')?.textContent;
    
            let downloadUrl
            let aliExpressLink;
            let alternateAliExpressLink;
            let promoVid;
    
            try {
                let onClickFunction = document.querySelector('#about > div.product-section-contaner.product-media > div.header-title > div > button')?.getAttribute('onclick');
                downloadUrl = onClickFunction?.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
                
                onClickFunction = document.querySelector('div.swiper-slide-active.osus-influencer>div>div>button')?.getAttribute('onclick');
                aliExpressLink = onClickFunction?.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
    
                try {
                    onClickFunction = document.querySelector('div.swiper-slide-next.osus-influencer>div>div>button')?.getAttribute('onclick');
                    alternateAliExpressLink = onClickFunction?.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
                } catch {}            
            } catch {}
            
            try {
                let onClickFunction = document.querySelector('#about > div:nth-child(4) > div > div > button')?.getAttribute('onclick');
                promoVid = onClickFunction?.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
            } catch {}
    
            let onClickFunction = document.querySelector('div.online-shops-contaner>div>button')?.getAttribute('onclick');
            let competitorStore = onClickFunction?.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1'); 
            
            return { interests, downloadUrl, productName, imageUrl, sellingPrice, productCost, profitMargin, aliExpressLink, alternateAliExpressLink, competitorStore, promoVid, productDescription, saturationValue };
        });
    
        try {
            await page.click('button.view-ads');
            await page.click('button.view-ad-post');
    
            await page.waitForTimeout(15000);
    
            let [_tab1, _tab2, tab3] = await browser.pages();
            
            info.facebookAd = tab3.url().replace(/.+?next=(.+)/, "$1");
        } catch {}
    
        browser.close();
    
        return info;
    }

    private getNextProduct = async () => {
        let snapshot = await this.database.ref('settings/nextProductId').get();
        if (snapshot.exists()) {
            return <number>snapshot.val();
        } else {
            return 2021;
        }
    }

    private getNextDemoProduct = async () => {
        let snapshot = await this.database.ref('settings/nextDemoProductId').get();
        if (snapshot.exists()) {
            return <number>snapshot.val();
        } else {
            return 2060;
        }
    }

    private setNextDemoProduct = async (productId: number) => {
        await this.database.ref('settings/nextDemoProductId').set(productId);
    }

    private setNextProduct = async (productId: number) => {
        await this.database.ref('settings/nextProductId').set(productId);
    }

    private login = async () => {
        let page = await this.browser.newPage();

        await page.goto(this.uri + '/login.php', { waitUntil: 'networkidle0' });

        await page.type('#username', config.droptrends.username!);
        await page.type('#password', config.droptrends.password!);
        await page.click('input[type="submit"]');

        await page.waitForSelector('body > nav > a:nth-child(10) > i');

        let cookies = await page.cookies();

        return cookies;
    }

    private pageExists = async (productId: number, cookies?: puppeteer.Protocol.Network.Cookie[]) => {
        let page = await this.browser.newPage();

        if (cookies) {
            await page.setCookie(...cookies);
        }

        await page.goto(`${this.uri}/view-product.php?pid=${productId}`);

        let el = await page.waitForSelector('.header-title-div1>h2', {timeout: 5000}).catch(() => null);

        return !!el;
    }

    public demo = async () => {
        const productId = await this.getNextDemoProduct();

        if (await this.pageExists(productId)) {
            const info = await this.scrapeProduct(`${this.uri}/view-product.php?pid=${productId}`);
            await this.setNextDemoProduct(productId + 1);
            return await this.getEmbed(info);
        }

        return null;
    }

    public run = async () => {
        const cookies = await this.login();
        let productId = await this.getNextProduct();
        let products: MessageEmbed[] = [];

        while (await this.pageExists(productId, cookies)) {
            const info = await this.scrapeProduct(`${this.uri}/view-product.php?pid=${productId}`, cookies);
            products.push(await this.getEmbed(info));
            
            productId++;
        }

        await this.setNextProduct(productId);
        return products;
    }
}
