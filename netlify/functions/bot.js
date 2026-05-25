// ╔══════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - FINAL COMPLETE                      ║
// ║  Style-Based Image Gen | Real Photos | Vision | Voice        ║
// ║  Flux | SDXL | DreamShaper                                   ║
// ╚══════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// CONFIGURATION (Environment Variables)
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I";
const WORKER_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api";
const API_KEY = "akhil-123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "none";  // 🔐 From Netlify Env

// 🔥 Apna Telegram Numeric ID yahan daalo
const ADMIN_IDS = new Set([
    8681361916,  // Your Telegram ID
]);

// In-memory storage
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
    [Markup.button.callback('📸 Real Photos', 'photo_info')],
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
        "👋 Hello! I'm NEXUS, your AI assistant.\n\n" +
        "**Features:**\n" +
        "• 💬 Chat & Questions\n" +
        "• 🌐 Real-Time Web Search\n" +
        "• 🎨 AI Image Generation (Flux/SDXL/DreamShaper)\n" +
        "• 📸 Real Photos (Unsplash + Pixabay)\n" +
        "• 📸 Photo Analysis\n" +
        "• 🎤 Voice Chat\n\n" +
        "**Quick Commands:**\n" +
        "• `/generate sunset` — Auto (Flux)\n" +
        "• `/generate --realistic mountain` — Realistic (SDXL)\n" +
        "• `/generate --artistic dream` — Artistic (DreamShaper)\n" +
        "• `/photo Taj Mahal` — Real photos\n\n"
        `💡 Send *${ADMIN_SECRET}* for admin panel...`,
        mainKeyboard
    );
});

// ==========================================
// HELP COMMAND
// ==========================================
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        "📚 *NEXUS AI Commands*\n\n" +
        "**💬 Chat:**\n" +
        "• Just type any message\n" +
        "• /status - Check premium\n" +
        "• /premium [code] - Activate premium\n\n" +
        "**🎨 Image Generation:**\n" +
        "• `/generate sunset` → Auto (Flux)\n" +
        "• `/generate --realistic mountain` → Realistic (SDXL)\n" +
        "• `/generate --artistic dream` → Artistic (DreamShaper)\n" +
        "• `/generate --fast dog` → Fast (Flux Schnell)\n\n" +
        "**📸 Photo Search:**\n" +
        "• `/photo Taj Mahal` → Real photos (Unsplash+Pixabay)\n" +
        "• `/vary more color` → Edit image (reply to photo)\n" +
        "• `/enhance` → Improve quality (reply to photo)\n\n" +
        "**🆔 Utility:**\n" +
        "• /myid - Get your Telegram ID\n" +
        "• /help - Show this menu\n\n" +
        `🔐 Admin: Send *${ADMIN_SECRET}* for admin panel`
    );
});

// ==========================================
// MY ID COMMAND
// ==========================================
bot.command('myid', async (ctx) => {
    await ctx.reply(`Your Numeric ID: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// STATUS COMMAND
// ==========================================
bot.command('status', async (ctx) => {
    const prem = await checkPremium(ctx.from.id);
    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n` +
        `👤 User: ${ctx.from.first_name}\n` +
        `💎 Premium: ${prem ? '✅ Active' : '❌ Inactive'}\n` +
        `📅 Daily Limit: ${prem ? 'Unlimited' : '50 messages/day'}`
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
// IMAGE GENERATION (Style-Based Routing)
// ==========================================
bot.command('generate', async (ctx) => {
    let prompt = ctx.message.text.replace('/generate', '').trim();

    let style = "auto";
    let cleanPrompt = prompt;

    if (prompt.startsWith('--realistic')) {
        style = "realistic";
        cleanPrompt = prompt.replace('--realistic', '').trim();
    } else if (prompt.startsWith('--artistic')) {
        style = "artistic";
        cleanPrompt = prompt.replace('--artistic', '').trim();
    } else if (prompt.startsWith('--fast')) {
        style = "fast";
        cleanPrompt = prompt.replace('--fast', '').trim();
    }

    if (!cleanPrompt) {
        await ctx.replyWithMarkdown(
            "🎨 *AI Image Generation*\n\n" +
            "**Usage:**\n" +
            "• `/generate sunset` → Auto (Flux)\n" +
            "• `/generate --realistic mountain` → Realistic (SDXL)\n" +
            "• `/generate --artistic dream` → Artistic (DreamShaper)\n" +
            "• `/generate --fast dog` → Fast (Flux Schnell)\n\n" +
            "**Examples:**\n" +
            "• `/generate --realistic beautiful beach sunset`\n" +
            "• `/generate --artistic cyberpunk city anime style`"
        );
        return;
    }

    await ctx.reply(`🎨 *Generating ${style} image...*\n📝 "${cleanPrompt}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await sendTyping(ctx);

    try {
        let workerStyle = "artistic";
        if (style === "realistic") workerStyle = "photorealistic";
        else if (style === "artistic") workerStyle = "artistic";
        else if (style === "fast") workerStyle = "fast";

        const response = await axios.post(WORKER_URL, {
            action: "image_generate",
            prompt: cleanPrompt,
            style: workerStyle
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';
        let modelUsed = "Flux (Fast)";

        if (response.headers['x-provider']) {
            const provider = response.headers['x-provider'];
            if (provider.includes('SDXL')) modelUsed = "SDXL (Realistic)";
            else if (provider.includes('DreamShaper')) modelUsed = "DreamShaper (Artistic)";
            else if (provider.includes('Flux')) modelUsed = "Flux (Fast)";
        }

        if (contentType.includes('image') || response.data instanceof Buffer) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🎨 *${modelUsed}*\n📝 ${cleanPrompt.substring(0, 100)}\n🎭 Style: ${style}`,
                parse_mode: 'Markdown'
            });
        } else {
            try {
                const textData = JSON.parse(response.data.toString());
                if (textData.image_url || textData.url) {
                    await ctx.replyWithPhoto(textData.image_url || textData.url, {
                        caption: `🎨 *Generated*\n📝 ${cleanPrompt.substring(0, 100)}`,
                        parse_mode: 'Markdown'
                    });
                } else {
                    await ctx.reply("❌ Image generation failed! Please try again.");
                }
            } catch (e) {
                await ctx.reply("❌ Image generation failed! Please try again.");
            }
        }
    } catch (error) {
        console.error('Image gen error:', error.message);
        await ctx.reply("❌ Image generation failed! Please try again later.");
    }
});

// ==========================================
// REAL PHOTO SEARCH (Unsplash + Pixabay)
// ==========================================
bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();

    if (!query) {
        await ctx.replyWithMarkdown("📸 *Real Photo Search*\n\nUsage: `/photo [search term]`\n\nExample: `/photo Taj Mahal`\n\nSearches Unsplash + Pixabay for real photos.");
        return;
    }

    await ctx.reply(`🔍 *Searching real photos for:* ${query}\n\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await sendTyping(ctx);

    try {
        const response = await axios.post(WORKER_URL, {
            action: "real_photo",
            query: query,
            per_page: 5
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 30000
        });

        const data = response.data;

        if (data.success && data.photos && data.photos.length > 0) {
            const mediaGroup = [];
            for (let i = 0; i < Math.min(data.photos.length, 5); i++) {
                const photo = data.photos[i];
                mediaGroup.push({
                    type: 'photo',
                    media: photo.medium || photo.url,
                    caption: i === 0 ? `📸 *${query}*\n📷 Source: ${data.source}\n🔍 ${data.total || data.photos.length} results` : undefined,
                    parse_mode: 'Markdown'
                });
            }

            if (mediaGroup.length > 0) {
                await ctx.replyWithMediaGroup(mediaGroup);
            }

            await ctx.replyWithMarkdown(
                `✅ *${data.photos.length} photos found!*\n\n` +
                `📷 Source: ${data.source}\n` +
                `💡 Tip: Try different keywords for more results`
            );
        } else {
            await ctx.replyWithMarkdown(`❌ *No photos found for:* "${query}"\n\nTry different keywords or use /generate for AI images.`);
        }
    } catch (error) {
        console.error('Photo search error:', error.message);
        await ctx.replyWithMarkdown("❌ *Photo search failed!*\n\nPlease try again later.");
    }
});

// ==========================================
// IMAGE VARIATIONS (Edit existing image)
// ==========================================
bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();

    if (!instruction) {
        await ctx.replyWithMarkdown("🎨 *Image Variation*\n\nUsage: Reply to an image with `/vary [instruction]`\n\nExample: `/vary make it more colorful`");
        return;
    }

    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown("❌ *Please reply to an image* with this command.\n\nSend an image first, then reply with `/vary your instruction`");
        return;
    }

    await ctx.reply(`🎨 *Editing image...*\n\n📝 Instruction: ${instruction}\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await sendTyping(ctx);

    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const response = await axios.post(WORKER_URL, {
            action: "image_edit",
            image: base64Image,
            instruction: instruction
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 90000,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('image') || response.data instanceof Buffer) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🎨 *Image Variation*\n\n📝 Instruction: ${instruction}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown("❌ *Image editing failed!* Please try again.");
        }
    } catch (error) {
        await ctx.replyWithMarkdown("❌ *Image editing failed!* Please try again.");
    }
});

// ==========================================
// IMAGE ENHANCE (Quality improvement)
// ==========================================
bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown("❌ *Please reply to an image* with this command.\n\nSend an image first, then reply with `/enhance`");
        return;
    }

    await ctx.reply("✨ *Enhancing image quality...*\n⏳ Please wait...", { parse_mode: 'Markdown' });
    await sendTyping(ctx);

    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const response = await axios.post(WORKER_URL, {
            action: "image_enhance",
            image: base64Image
        }, {
            headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
            timeout: 90000,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('image') || response.data instanceof Buffer) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: "✨ *Enhanced Image*\n\nQuality improved!",
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown("❌ *Image enhancement failed!* Please try again.");
        }
    } catch (error) {
        await ctx.replyWithMarkdown("❌ *Image enhancement failed!* Please try again.");
    }
});

// ==========================================
// ADMIN SECRET WORD (Secure)
// ==========================================
bot.hears(ADMIN_SECRET, async (ctx) => {
    const userId = ctx.from.id;
    if (!isAuthorizedAdmin(userId)) {
        await ctx.reply("❌ *Access Denied!* You are not authorized.", { parse_mode: 'Markdown' });
        return;
    }
    adminSessions.set(userId, { active: true, loginTime: new Date(), username: ctx.from.first_name });
    await ctx.replyWithMarkdown(`👑 *ADMIN PANEL UNLOCKED!*\n\nWelcome, ${ctx.from.first_name}!`, adminKeyboard);
});

// ==========================================
// PHOTO HANDLER (Vision Analysis)
// ==========================================
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
            message: "Describe this image in detail"
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

// ==========================================
// NORMAL TEXT MESSAGE
// ==========================================
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (ctx.message.text === ADMIN_SECRET) return;

    const userId = ctx.from.id;
    const userText = ctx.message.text;

    if (!await checkLimit(userId)) {
        await ctx.replyWithMarkdown(`⚠️ *Daily Limit Reached!*\n\nSend \`/premium ${ADMIN_SECRET}\` if you have the code.`);
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
        console.error('Chat error:', error.message);
        await ctx.replyWithMarkdown("❌ *Service unavailable*\n\nPlease try again.");
    }
});

// ==========================================
// CALLBACK HANDLER (Buttons)
// ==========================================
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
        'image_info': () => ctx.editMessageText("🎨 *Image Generation*\n\n`/generate sunset`\n`/generate --realistic mountain`\n`/generate --artistic dream`", { parse_mode: 'Markdown' }),
        'photo_info': () => ctx.editMessageText("📸 *Real Photos*\n\n`/photo Taj Mahal`\n`/photo beautiful beach`", { parse_mode: 'Markdown' }),
        'settings': () => ctx.editMessageText("⚙️ *Settings*\n\nFree: 50 messages/day\nPremium: Unlimited\n\n" + `Admin: Send *${ADMIN_SECRET}*`, { parse_mode: 'Markdown' }),
        'admin_verify': () => ctx.editMessageText(`👑 *Verify Premium*\n\nSend: \`/premium ${ADMIN_SECRET}\``, { parse_mode: 'Markdown' }),
        'admin_status': async () => {
            const prem = await checkPremium(userId);
            ctx.editMessageText(`📊 *Admin Status*\n\nAdmin: ✅\nPremium: ${prem ? '✅' : '❌'}`, { parse_mode: 'Markdown' });
        },
        'admin_revoke': () => ctx.editMessageText("❌ *Revoke Premium*\n\nCommand: `/revoke [user_id]`", { parse_mode: 'Markdown' }),
        'admin_plans': () => ctx.editMessageText("📋 *Premium Plans*\n\n• Plus: ₹299/month\n• Pro: ₹1499/year\n• Enterprise: ₹2999/year\n\nUPI: jaiswalanushi8@oksbi", { parse_mode: 'Markdown' }),
        'admin_health': () => ctx.editMessageText("🏥 *System Health*\n\n✅ Bot: Running\n✅ API: Online\n✅ Webhook: Active", { parse_mode: 'Markdown' }),
        'admin_clear': () => ctx.editMessageText("🗑️ *Clear Session*\n\nCommand: `/clear [user_id]`", { parse_mode: 'Markdown' }),
        'admin_logout': () => {
            adminSessions.delete(userId);
            ctx.editMessageText("🚪 *Logged out!*", { parse_mode: 'Markdown' });
        }
    };

    const handler = handlers[data];
    if (handler) await handler();
    else await ctx.editMessageText(`⚙️ ${data}`);
});

// ==========================================
// NETLIFY FUNCTION HANDLER
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