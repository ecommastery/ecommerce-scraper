import { MessageEmbed } from "discord.js";
import firebase from "firebase";
import puppeteer from "puppeteer";
import IScraper from "../interfaces/scraper.interface";

export class Scraper implements IScraper {
    constructor (public browser: puppeteer.Browser, public database: firebase.database.Database) {}

    run(): Promise<MessageEmbed[]> {
        throw new Error("Method not implemented.");
    }

    demo(): Promise<MessageEmbed | null> {
        throw new Error("Method not implemented.");
    }
}