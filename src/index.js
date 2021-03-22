const { WebhookClient } = require('discord.js');
const { writeFileSync } = require('fs');
const { webhook_token, webhook_id, last_check, username, password } = require('./config.json');
const puppeteer = require('puppeteer');

const uri = 'https://www.droptrends.site';

let sendWebhook = async (info) => {
    let webhook = new WebhookClient(webhook_id, webhook_token);

    let embed = {
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

let scrapeProduct = async (link, cookies) => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.setCookie(...cookies);

    await page.goto(link, { waitUntil: 'networkidle0' });

    let info = await page.evaluate(async () => {
        let productName = document.querySelector('.header-title-div1>h2').innerText; 
        let selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div2';
        let productDescription = document.querySelector(selector).innerText;
        let imageUrl = document.querySelector('div.product-images-contaner>div>div>div.swiper-slide-active').style.backgroundImage.replace(/url\("(.+)"\)/, '$1');
        let sellingPrice = document.querySelector('b.product-informations-value-dark').innerText;
        let productCost = document.querySelector('b.product-informations-value-green').innerText;
        let profitMargin = document.querySelector('b.product-informations-value-red').innerText;
        selector = '#about > div.product-section-contaner.product-informations > div.product-information-contaner > div.product-informations-div1 > div > div:nth-child(4) > b';
        let saturationValue = document.querySelector(selector).innerText;
        let interests = document.querySelector('li.targeting-interests > b').innerText;

        let downloadUrl
        let aliExpressLink;
        let alternateAliExpressLink;
        let promoVid;

        try {
            let onClickFunction = document.querySelector('#about > div.product-section-contaner.product-media > div.header-title > div > button').onclick.toString();
            downloadUrl = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
            
            onClickFunction = document.querySelector('div.swiper-slide-active.osus-influencer>div>div>button').onclick.toString();
            aliExpressLink = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');

            try {
                onClickFunction = document.querySelector('div.swiper-slide-next.osus-influencer>div>div>button').onclick.toString();
                alternateAliExpressLink = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
            } catch {}            
        } catch {}
        
        try {
            let onClickFunction = document.querySelector('#about > div:nth-child(4) > div > div > button').onclick.toString();
            promoVid = onClickFunction.replace(/\n/g, '').replace(/.+'(.+)'.+/, '$1');
        } catch {}

        onClickFunction = document.querySelector('div.online-shops-contaner>div>button').onclick.toString();
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

let getNewProducts = async (cookies) => {
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.setCookie(...cookies)

    await page.goto(uri, { waitUntil: 'networkidle0' });

    let products = await page.evaluate(({ last_check, uri }) => {
        let getUrl = e => uri + '/view-product.php?pid=' + e.querySelector('.product-id').innerText;
        let isRecent = e => last_check <= e.querySelector('.product-perfix').innerText && e.querySelector('.product-id');
        return Array.from(document.querySelectorAll('.li-item')).filter(isRecent).map(getUrl);
    }, { last_check, uri });  

    browser.close();

    return products;
}

let login = async () => {
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

let main = async () => {
    let cookies = await login();
    let new_products = await getNewProducts(cookies);

    for (let product of new_products) {
        try {
            let info = await scrapeProduct(product, cookies);
            await sendWebhook(info); 
        } catch {};   
    };

    let currentDate = (new Date()).toISOString().replace("T", " ").replace(/(\..+)/, '');

    let config = { webhook_id, webhook_token, last_check: currentDate, username, password };
    writeFileSync('./src/config.json', JSON.stringify(config));
}

main();