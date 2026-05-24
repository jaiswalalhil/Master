// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - FINAL DEPLOY READY                  ║
// ║  Token: New | Admin: KaaliNexus@2026                         ║
// ╚══════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// CONFIGURATION
// ==========================================
const BOT_TOKEN = "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I";
const WORKER_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api";
const API_KEY = "akhil-123";
const ADMIN_SECRET = "KaaliNexus@2026";

// Admin IDs - Apna numeric ID daalo
const ADMIN_IDS = new Set([
    8681361916,  // Apna Telegram ID
]);

// Storage
let adminSessions = new Map();
let premiumUsers = new Map();
let userMessageCount = new Map();

// ==========================================
// FORMAT FOR TELEGRAM
// ==========================================
function formatForTelegram(text) {
    if (!text) return '';
    let result = text;
    result = result.replace(/^#{1,6}\s+/gm, '');
    result = result.replace(/\|(.+?)\|/g, function(match) {
        if (match.includes('---')) return '';
        let cells = match.split('|').filter(c => c.trim());
        if (cells.length === 0) return '';
        return cells.map(c => `• ${c.trim()}`).join('\n');
    });
    result = result.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)');
    result = result.replace(/\n{3,}/g, '\n\n');
    return result.trim();
}

// ==========================================
// HELPERS
// ==========================================
function getToday() {
    return new Date().toISOString().split('T')[0];
}

function isAuthorizedAdmin(userId) {
    return ADMIN_IDS.has(userId);
}

async function checkPremium(userId) {
    if (premiumUsers.has(userId)) return true;
    try {
        const res = await axios.post(WORKER_URL, {
            action: "premium_status",
            userId: String(userId)
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 5000
        });
        return res.data?.isPremium || false;
    } catch {
        return false;
    }
}

async function checkLimit(userId) {
    if (adminSessions.has(userId)) return true;
    if (await checkPremium(userId)) return true;
    const today = getToday();
    const key = `${userId}_${today}`;
    const count = userMessageCount.get(key) || 0;
    if (count >= 50) return false;
    userMessageCount.set(key, count + 1);
    return true;
}

async function sendTyping(ctx) {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
}

// ==========================================
// KEYBOARDS
// ==========================================
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💬 New Chat', 'new_chat')],
    [Markup.button.callback('🎨 Generate Image', 'image_info')],
    [Markup.button.callback('📸 Photo Analysis', 'photo_info')],
    [Markup.button.callback('⚙️ Settings', 'settings')]
]);

const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👑 Verify Premium', 'admin_verify')],
    [Markup.button.callback('📊 Check Status', 'admin_status')],
    [Markup.button.callback('❌ Revoke Premium', 'admin_revoke')],
    [Markup.button.callback('📋 View Plans', 'admin_plans')],
    [Markup.button.callback('🏥 System Health', 'admin_health')],
    [Markup.button.callback('🗑️ Clear Session', 'admin_clear')],
    [Markup.button.callback('🚪 Logout', 'admin_logout')]
]);

// ==========================================
// BOT
// ==========================================
const bot = new Telegraf(BOT_TOKEN);

// START
bot.start(async (ctx) => {
    await ctx.replyWithMarkdown(
        "🤖 *NEXUS AI — GPT-5.5 Level*\n\n" +
        "👋 Hello! I'm NEXUS, your AI assistant.\n\n" +
        "• 💬 Chat & Questions\n" +
        "• 🌐 Real-Time Web Search\n" +
        "• 🎨 AI Image Generation\n" +
        "• 📸 Photo Analysis\n\n" +
        `💡 Send *${ADMIN_SECRET}* for admin panel...`,
        mainKeyboard
    );
});

// HELP
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        "📚 *Commands*\n\n" +
        "/start - Restart bot\n" +
        "/status - Check premium\n" +
        "/premium [code] - Activate premium\n" +
        "/generate [prompt] - Generate image\n\n" +
        `🔐 Admin: Send *${ADMIN_SECRET}*`
    );
});

// MY ID
bot.command('myid', async (ctx) => {
    await ctx.reply(`Your Numeric ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// STATUS
bot.command('status', async (ctx) => {
    const prem = await checkPremium(ctx.from.id);
    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n` +
        `👤 User: ${ctx.from.first_name}\n` +
        `💎 Premium: ${prem ? '✅ Active' : '❌ Inactive'}`
    );
});

// PREMIUM
bot.command('premium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const code = args[1];
    if (!code) {
        await ctx.replyWithMarkdown("❌ Usage: `/premium [code]`");
        return;
    }
    if (code === ADMIN_SECRET) {
        premiumUsers.set(ctx.from.id, true);
        await ctx.replyWithMarkdown("✅ *Premium Activated!*");
    } else {
        await ctx.replyWithMarkdown("❌ *Invalid code!*");
    }
});

// GENERATE IMAGE
bot.command('generate', async (ctx) => {
    const prompt = ctx.message.text.replace('/generate', '').trim();
    if (!prompt) {
        await ctx.replyWithMarkdown("🎨 *Usage:* `/generate [prompt]`\n\nExample: `/generate Beautiful sunset`");
        return;
    }
    await ctx.reply("🎨 *Generating image...* Please wait.", { parse_mode: 'Markdown' });
    await sendTyping(ctx);
    
    try {
        const response = await axios.post(WORKER_URL, {
            action: "image_generate",
            prompt: prompt,
            style: "artistic"
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });
        
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('image') || response.data instanceof Buffer) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🎨 *Generated:* ${prompt.substring(0, 50)}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply("❌ Image generation failed!");
        }
    } catch (error) {
        await ctx.reply("❌ Image generation failed! Please try again.");
    }
});

// ADMIN SECRET WORD
bot.hears(ADMIN_SECRET, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAuthorizedAdmin(userId)) {
        await ctx.reply("❌ *Access Denied!*", { parse_mode: 'Markdown' });
        return;
    }
    adminSessions.set(userId, { active: true, loginTime: new Date(), username: ctx.from.first_name });
    await ctx.replyWithMarkdown(`👑 *ADMIN PANEL UNLOCKED!*\n\nWelcome, ${ctx.from.first_name}!`, adminKeyboard);
});

// PHOTO HANDLER
bot.on('photo', async (ctx) => {
    await sendTyping(ctx);
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const response = await axios.post(WORKER_URL, {
            action: "chat",
            image: base64Image,
            message: "Describe this image"
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 60000
        });
        let analysis = response.data.response || "Image analyzed!";
        analysis = formatForTelegram(analysis);
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        await ctx.reply("❌ Image analysis failed!");
    }
});

// VOICE HANDLER
bot.on('voice', async (ctx) => {
    await sendTyping(ctx);
    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const voiceResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const formData = new FormData();
        formData.append('audio', Buffer.from(voiceResponse.data), { filename: 'voice.ogg', contentType: 'audio/ogg' });
        formData.append('language', 'hi');
        const response = await axios.post(`${WORKER_URL}/voice-chat`, formData, {
            headers: { ...formData.getHeaders(), "X-API-Key": API_KEY },
            timeout: 60000
        });
        let reply = response.data.response || "Voice processed!";
        reply = formatForTelegram(reply);
        await ctx.reply(reply);
    } catch (error) {
        await ctx.reply("❌ Voice processing failed!");
    }
});

// DOCUMENT HANDLER
bot.on('document', async (ctx) => {
    await sendTyping(ctx);
    try {
        const doc = ctx.message.document;
        const file = await ctx.telegram.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileResponse.data).toString('base64');
        const response = await axios.post(WORKER_URL, {
            action: "analyze_file",
            filename: doc.file_name,
            content: base64File
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 90000
        });
        let analysis = response.data.response || "File analyzed!";
        analysis = formatForTelegram(analysis);
        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${analysis.substring(0, 2000)}`);
    } catch (error) {
        await ctx.reply("❌ File analysis failed!");
    }
});

// TEXT MESSAGE
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.message.text === ADMIN_SECRET) return;
    
    const userId = ctx.from.id;
    const userText = ctx.message.text;
    
    if (!await checkLimit(userId)) {
        await ctx.replyWithMarkdown(`⚠️ *Daily Limit Reached!*\n\nSend \`/premium ${ADMIN_SECRET}\``);
        return;
    }
    
    await sendTyping(ctx);
    
    const headers = { "Content-Type": "application/json", "X-API-Key": API_KEY };
    if (adminSessions.has(userId)) {
        headers["X-User-ID"] = "akhil";
    }
    
    try {
        const startTime = Date.now();
        const response = await axios.post(WORKER_URL, {
            action: "chat",
            message: userText
        }, {
            headers: headers,
            timeout: 60000
        });
        
        const latency = Date.now() - startTime;
        let reply = response.data.response || 'No response';
        const model = response.data.model || 'AI';
        
        reply = formatForTelegram(reply);
        
        if (adminSessions.has(userId)) {
            reply = `👑 *[ADMIN MODE]*\n\n${reply}`;
        }
        
        if (reply.length > 4000) {
            for (let i = 0; i < reply.length; i += 4000) {
                await ctx.reply(reply.substring(i, i + 4000), { parse_mode: 'Markdown' });
            }
        } else {
            await ctx.reply(`${reply}\n\n⚡ ${latency}ms | 🤖 ${model}`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await ctx.replyWithMarkdown("❌ *Service unavailable*\n\nPlease try again.");
    }
});

// CALLBACK HANDLER
bot.action(/.*/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    await ctx.answerCbQuery();
    
    if (data.startsWith('admin_') && !adminSessions.has(userId)) {
        await ctx.editMessageText("❌ Admin access required!");
        return;
    }
    
    const handlers = {
        'new_chat': () => ctx.editMessageText("💬 *New Chat Started!*", { parse_mode: 'Markdown' }),
        'image_info': () => ctx.editMessageText("🎨 `/generate [prompt]`\nExample: `/generate sunset`", { parse_mode: 'Markdown' }),
        'photo_info': () => ctx.editMessageText("📸 Send any photo for analysis!", { parse_mode: 'Markdown' }),
        'settings': () => ctx.editMessageText("⚙️ Free: 50/day | Premium: Unlimited", { parse_mode: 'Markdown' }),
        'admin_verify': () => ctx.editMessageText(`👑 Send: \`/premium ${ADMIN_SECRET}\``, { parse_mode: 'Markdown' }),
        'admin_status': async () => {
            const prem = await checkPremium(userId);
            ctx.editMessageText(`📊 Admin: ✅\nPremium: ${prem ? '✅' : '❌'}`, { parse_mode: 'Markdown' });
        },
        'admin_revoke': () => ctx.editMessageText("❌ Command: `/revoke [user_id]`", { parse_mode: 'Markdown' }),
        'admin_plans': () => ctx.editMessageText("📋 Plus: ₹299 | Pro: ₹1499 | Enterprise: ₹2999", { parse_mode: 'Markdown' }),
        'admin_health': () => ctx.editMessageText("🏥 Bot: ✅ | API: ✅", { parse_mode: 'Markdown' }),
        'admin_clear': () => ctx.editMessageText("🗑️ Command: `/clear [user_id]`", { parse_mode: 'Markdown' }),
        'admin_logout': () => {
            adminSessions.delete(userId);
            ctx.editMessageText("🚪 Logged out!", { parse_mode: 'Markdown' });
        }
    };
    
    const handler = handlers[data];
    if (handler) await handler();
    else await ctx.editMessageText(`⚙️ ${data}`);
});

// ==========================================
// NETLIFY HANDLER
// ==========================================
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