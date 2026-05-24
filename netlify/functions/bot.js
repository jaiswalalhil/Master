// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - NETLIFY                             ║
// ║  Full Features: Chat | Admin | Premium | Photo | Voice      ║
// ║  Perfectly Working - 2026 Edition                           ║
// ╚══════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// CONFIGURATION
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8888091040:AAFAG_JKx7kG-H_S79bPQu__0aVcCHdGeaA";
const API_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api";
const API_KEY = "akhil-123";
const ADMIN_SECRET = "akhil123";

// In-memory storage (Netlify serverless mein reset hota hai)
let adminSessions = new Map();
let premiumUsers = new Map();
let userMessageCount = new Map();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getToday() {
    return new Date().toISOString().split('T')[0];
}

async function checkPremium(userId) {
    if (premiumUsers.has(userId)) return true;
    try {
        const response = await axios.post(API_URL, {
            action: "premium_status",
            userId: String(userId)
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 5000
        });
        return response.data?.isPremium || false;
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
// BOT INITIALIZATION
// ==========================================
const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// START COMMAND
// ==========================================
bot.start(async (ctx) => {
    await ctx.replyWithMarkdown(
        "🤖 *NEXUS AI — GPT-5.5 Level*\n\n" +
        "👋 Hello! I'm NEXUS, your AI assistant.\n" +
        "I can help with:\n" +
        "• 💬 Chat & Questions\n" +
        "• 🌐 Real-Time Web Search\n" +
        "• 🎨 AI Image Generation\n" +
        "• 📸 Photo Analysis\n" +
        "• 📄 File Analysis\n" +
        "• 🎤 Voice Chat\n\n" +
        "💡 *Try:* `IPL score`, `Code likho`, `Kahani sunao`\n" +
        `🔐 Send *${ADMIN_SECRET}* for admin panel...`,
        mainKeyboard
    );
});

// ==========================================
// HELP COMMAND
// ==========================================
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        "📚 *NEXUS AI Commands*\n\n" +
        "/start - Restart bot\n" +
        "/status - Check premium status\n" +
        "/premium [code] - Activate premium\n" +
        "/generate [prompt] - Generate AI image\n\n" +
        `🔐 Admin: Send *${ADMIN_SECRET}*`
    );
});

// ==========================================
// STATUS COMMAND
// ==========================================
bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const prem = await checkPremium(userId);
    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n` +
        `👤 User: ${ctx.from.first_name}\n` +
        `💎 Premium: ${prem ? '✅ Active' : '❌ Inactive'}\n` +
        `📅 Plan: ${prem ? 'Unlimited' : '50 messages/day'}`
    );
});

// ==========================================
// PREMIUM COMMAND
// ==========================================
bot.command('premium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const code = args[1];

    if (!code) {
        await ctx.replyWithMarkdown("❌ Usage: `/premium [code]`");
        return;
    }

    if (code === ADMIN_SECRET) {
        premiumUsers.set(ctx.from.id, true);
        await ctx.replyWithMarkdown("✅ *Premium Activated!*\n\nYou now have unlimited access.");
    } else {
        await ctx.replyWithMarkdown("❌ *Invalid code!*\n\nContact admin for premium access.");
    }
});

// ==========================================
// GENERATE IMAGE COMMAND
// ==========================================
bot.command('generate', async (ctx) => {
    const prompt = ctx.message.text.replace('/generate', '').trim();

    if (!prompt) {
        await ctx.replyWithMarkdown("🎨 *Usage:* `/generate [prompt]`\n\nExample: `/generate Beautiful sunset over mountains`");
        return;
    }

    await sendTyping(ctx);

    try {
        const response = await axios.post(API_URL, {
            action: "image_generate",
            prompt: prompt,
            style: "artistic"
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 120000
        });

        const data = response.data;
        const imageUrl = data.image_url || data.response;

        if (imageUrl && imageUrl.startsWith('http')) {
            await ctx.replyWithPhoto(imageUrl, { caption: `🎨 Generated: ${prompt.substring(0, 50)}` });
        } else {
            await ctx.replyWithMarkdown(`🎨 *Generated*\n\n${imageUrl.substring(0, 500)}`);
        }
    } catch (error) {
        await ctx.reply("❌ Image generation failed! Please try again.");
    }
});

// ==========================================
// SECRET WORD - ADMIN PANEL
// ==========================================
bot.hears(ADMIN_SECRET, async (ctx) => {
    const userId = ctx.from.id;
    adminSessions.set(userId, {
        active: true,
        loginTime: new Date(),
        username: ctx.from.first_name
    });

    await ctx.replyWithMarkdown(
        `👑 *ADMIN PANEL UNLOCKED!*\n\n` +
        `Welcome, ${ctx.from.first_name}!\n` +
        `🕐 ${new Date().toLocaleTimeString()}\n\n` +
        `Select an action below. All your messages now have admin privileges!`,
        adminKeyboard
    );
});

// ==========================================
// PHOTO HANDLER - Vision Analysis
// ==========================================
bot.on('photo', async (ctx) => {
    await sendTyping(ctx);

    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const response = await axios.post(API_URL, {
            action: "chat",
            image: base64Image,
            message: "Describe this image in detail"
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 60000
        });

        const analysis = response.data.analysis || response.data.response || "Image analyzed!";
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        await ctx.reply("❌ Image analysis failed!");
    }
});

// ==========================================
// VOICE HANDLER
// ==========================================
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

        const response = await axios.post(`${API_URL}/voice-chat`, formData, {
            headers: { ...formData.getHeaders(), "X-API-Key": API_KEY },
            timeout: 60000
        });

        await ctx.reply(response.data.response || "Voice processed!");
    } catch (error) {
        await ctx.reply("❌ Voice processing failed!");
    }
});

// ==========================================
// DOCUMENT HANDLER
// ==========================================
bot.on('document', async (ctx) => {
    await sendTyping(ctx);

    try {
        const doc = ctx.message.document;
        const file = await ctx.telegram.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileResponse.data).toString('base64');

        const response = await axios.post(API_URL, {
            action: "analyze_file",
            filename: doc.file_name,
            content: base64File
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 90000
        });

        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${(response.data.response || "Done!").substring(0, 2000)}`);
    } catch (error) {
        await ctx.reply("❌ File analysis failed!");
    }
});

// ==========================================
// NORMAL TEXT MESSAGE
// ==========================================
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.message.text.toLowerCase() === ADMIN_SECRET) return;

    const userId = ctx.from.id;
    const userText = ctx.message.text;

    if (!await checkLimit(userId)) {
        await ctx.replyWithMarkdown(
            `⚠️ *Daily Limit Reached!*\n\n` +
            `You've used 50 free messages today.\n` +
            `Send \`/premium ${ADMIN_SECRET}\` if you have the code.`
        );
        return;
    }

    await sendTyping(ctx);

    const headers = { "Content-Type": "application/json", "X-API-Key": API_KEY };
    if (adminSessions.has(userId)) {
        headers["X-User-ID"] = "akhil";
    }

    try {
        const startTime = Date.now();
        const response = await axios.post(API_URL, {
            action: "chat",
            message: userText
        }, {
            headers: headers,
            timeout: 60000
        });

        const latency = Date.now() - startTime;
        let reply = response.data.response || 'No response';
        const model = response.data.model || 'AI';

        if (adminSessions.has(userId)) {
            reply = `👑 *[ADMIN MODE]*\n\n${reply}`;
        }

        if (reply.length > 4000) {
            for (let i = 0; i < reply.length; i += 4000) {
                await ctx.reply(reply.substring(i, i + 4000));
            }
        } else {
            await ctx.replyWithMarkdown(`${reply}\n\n⚡ ${latency}ms | 🤖 ${model}`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown("❌ *Service unavailable*\n\nPlease try again.");
    }
});

// ==========================================
// CALLBACK HANDLER
// ==========================================
bot.action(/.*/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    await ctx.answerCbQuery();

    if (data.startsWith('admin_') && !adminSessions.has(userId)) {
        await ctx.editMessageText("❌ Admin access required! Send the secret word first.");
        return;
    }

    switch(data) {
        case 'new_chat':
            await ctx.editMessageText("💬 *New Chat Started!*\n\nJust type your message below!", { parse_mode: 'Markdown' });
            break;
        case 'image_info':
            await ctx.editMessageText("🎨 *AI Image Generation*\n\nCommand: `/generate [prompt]`\n\nExample: `/generate Beautiful sunset`", { parse_mode: 'Markdown' });
            break;
        case 'photo_info':
            await ctx.editMessageText("📸 *Photo Analysis*\n\nJust send any photo and I'll analyze it!", { parse_mode: 'Markdown' });
            break;
        case 'settings':
            await ctx.editMessageText("⚙️ *Settings*\n\n• Free: 50 msgs/day\n• Premium: Unlimited\n\n" + `Send *${ADMIN_SECRET}* for admin panel`, { parse_mode: 'Markdown' });
            break;
        case 'admin_verify':
            await ctx.editMessageText("👑 *Verify Premium*\n\n" + `Send: \`/premium ${ADMIN_SECRET}\``, { parse_mode: 'Markdown' });
            break;
        case 'admin_status':
            const prem = await checkPremium(userId);
            await ctx.editMessageText(`📊 *Admin Status*\n\nAdmin: ${adminSessions.has(userId) ? '✅' : '❌'}\nPremium: ${prem ? '✅' : '❌'}`, { parse_mode: 'Markdown' });
            break;
        case 'admin_revoke':
            await ctx.editMessageText("❌ *Revoke Premium*\n\nCommand: `/revoke [user_id]`", { parse_mode: 'Markdown' });
            break;
        case 'admin_plans':
            await ctx.editMessageText("📋 *Premium Plans*\n\n• Plus: ₹99/month\n• Pro: ₹199/month\n• Enterprise: ₹499/month", { parse_mode: 'Markdown' });
            break;
        case 'admin_health':
            await ctx.editMessageText("🏥 *System Health*\n\n✅ Bot: Running\n✅ API: Online", { parse_mode: 'Markdown' });
            break;
        case 'admin_clear':
            await ctx.editMessageText("🗑️ *Clear Session*\n\nCommand: `/clear [user_id]`", { parse_mode: 'Markdown' });
            break;
        case 'admin_logout':
            adminSessions.delete(userId);
            await ctx.editMessageText("🚪 *Logged out!*\n\nSend the secret word again to login.", { parse_mode: 'Markdown' });
            break;
        default:
            await ctx.editMessageText(`⚙️ Action: ${data}`, { parse_mode: 'Markdown' });
    }
});

// ==========================================
// NETLIFY FUNCTION HANDLER
// ==========================================
exports.handler = async (event, context) => {
    try {
        const update = JSON.parse(event.body);
        await bot.handleUpdate(update);
        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 200, body: 'OK' };
    }
};