const { Telegraf } = require('telegraf');

const BOT_TOKEN = "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I";
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
    await ctx.reply("✅ Bot is alive! Send /help for commands.");
});

bot.help(async (ctx) => {
    await ctx.reply("Commands: /start, /help, /status");
});

bot.command('status', async (ctx) => {
    await ctx.reply("Bot is running perfectly!");
});

bot.on('text', async (ctx) => {
    await ctx.reply(`Echo: ${ctx.message.text}`);
});

exports.handler = async (event) => {
    try {
        const update = JSON.parse(event.body);
        await bot.handleUpdate(update);
        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 200, body: 'OK' };
    }
};
