import { MessageEmbed } from "discord.js";

export default interface IScraper {
    run(): Promise<MessageEmbed[]>
    demo(): Promise<MessageEmbed | null>
}