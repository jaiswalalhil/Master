const { Telegraf } = require('telegraf');

const BOT_TOKEN = "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I";
const bot = new Telegraf(BOT_TOKEN);

// Har text message par "pong" bhejega
bot.on('text', async (ctx) => {
    console.log("📩 Message received:", ctx.message.text);
    await ctx.reply("🏓 Pong!");
});

// /start command
bot.start(async (ctx) => {
    await ctx.reply("✅ Bot is alive! Send any message.");
});

// /test command
bot.command('test', async (ctx) => {
    await ctx.reply("✅ Test command working!");
});

// Health check for browser
bot.telegram.setWebhook('https://nexus-master.netlify.app/.netlify/functions/bot');

exports.handler = async (event) => {
    try {
        const update = JSON.parse(event.body);
        await bot.handleUpdate(update);
        return { statusCode: 200, body: "OK" };
    } catch (err) {
        console.error("Error:", err);
        return { statusCode: 200, body: "OK" };
    }
};