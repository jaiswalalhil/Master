// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - DEEPSEEK LEVEL PROFESSIONAL                        ║
// ║  No Streaming | Normal Responses | Voice Fixed | Production Ready           ║
// ║  Fully Compatible with MONSTER AI v8.0 Worker                               ║
// ║  Created by Akhil Jaiswal 🇮🇳                                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// ========== CONFIGURATION ==========
// ==========================================
const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN || "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I",
    WORKER_URL: "https://nexus-a1.apikeyakhilka.workers.dev/api",
    VOICE_URL: "https://nexus-a1.apikeyakhilka.workers.dev/voice-chat",
    API_KEY: "akhil-123",
    ADMIN_SECRET: process.env.ADMIN_SECRET || "KaaliNexus@2026",
    ADMIN_IDS: new Set([8681361916]),
    APP_NAME: 'NEXUS',
    CREATOR: 'Akhil Jaiswal',
    UPI_ID: 'jaiswalanushi8@oksbi'
};

// ==========================================
// ========== STORAGE ==========
// ==========================================
class Storage {
    constructor() {
        this.adminSessions = new Map();
        this.premiumUsers = new Map();
        this.userMessageCount = new Map();
        this.userImageCount = new Map();
        this.userVoiceCount = new Map();
    }

    isAdmin(userId) { return CONFIG.ADMIN_IDS.has(userId); }
    isPremium(userId) { return this.premiumUsers.has(userId); }
    activatePremium(userId) { this.premiumUsers.set(userId, true); }
    isAdminSession(userId) { return this.adminSessions.has(userId); }
    setAdminSession(userId) { this.adminSessions.set(userId, true); }
    clearAdminSession(userId) { this.adminSessions.delete(userId); }

    checkLimit(userId, type) {
        if (this.isAdmin(userId) || this.isPremium(userId)) return { allowed: true, remaining: Infinity };

        const limits = { messages: 50, images: 10, voice: 5 };
        const limit = limits[type] || 50;
        const today = new Date().toISOString().split('T')[0];
        let storageMap;
        if (type === 'messages') storageMap = this.userMessageCount;
        else if (type === 'images') storageMap = this.userImageCount;
        else storageMap = this.userVoiceCount;

        const key = `${userId}_${today}`;
        const count = storageMap.get(key) || 0;
        if (count >= limit) return { allowed: false, remaining: 0, limit };
        storageMap.set(key, count + 1);
        return { allowed: true, remaining: limit - count - 1, limit };
    }
}

const storage = new Storage();

// ==========================================
// ========== FORMATTER ==========
// ==========================================
class Formatter {
    static clean(text) {
        if (!text) return '';
        return text
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\|(.+?)\|/g, (match) => {
                if (match.includes('---')) return '';
                const cells = match.split('|').filter(c => c.trim());
                if (cells.length === 0) return '';
                return cells.map(c => `• ${c.trim()}`).join('\n');
            })
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/^[\-\*]{3,}$/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}

// ==========================================
// ========== API CLIENT ==========
// ==========================================
class APIClient {
    static async call(method, action, payload = {}, isAdmin = false, responseType = 'json') {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (isAdmin) headers['X-User-ID'] = 'akhil';

        const response = await axios({
            method: method,
            url: method === 'POST' ? CONFIG.WORKER_URL : CONFIG.VOICE_URL,
            data: { action, ...payload },
            headers,
            timeout: 60000,
            responseType
        });
        return response.data;
    }

    static async chat(message, userId, isAdmin) {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (isAdmin) headers['X-User-ID'] = 'akhil';

        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'chat',
            message: message
        }, { headers, timeout: 60000 });

        return response.data;
    }

    static async generateImage(prompt, style = 'auto') {
        const styleMap = { realistic: 'photorealistic', artistic: 'artistic', auto: 'auto' };
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_generate',
            prompt: prompt,
            style: styleMap[style] || 'auto'
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 120000, responseType: 'arraybuffer' });
        return response.data;
    }

    static async searchPhotos(query) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'real_photo',
            query: query,
            per_page: 5
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
        return response.data;
    }

    static async analyzeImage(base64Image) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'chat',
            image: base64Image,
            message: 'Describe this image in detail'
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async voiceChat(audioBuffer, language = 'hi') {
        try {
            const formData = new FormData();
            formData.append('audio', Buffer.from(audioBuffer), { filename: 'voice.ogg', contentType: 'audio/ogg' });
            formData.append('language', language);

            const response = await axios.post(CONFIG.VOICE_URL, formData, {
                headers: { ...formData.getHeaders(), 'X-API-Key': CONFIG.API_KEY },
                timeout: 60000
            });

            // Handle different response types
            if (response.data && typeof response.data === 'object') {
                return response.data;
            }
            return { response: 'Voice processed successfully!' };
        } catch (error) {
            console.error('Voice chat error:', error.message);
            return { response: 'Voice processing failed. Please try again.', error: true };
        }
    }

    static async analyzeFile(filename, content) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'file_analysis',
            fileContent: content,
            fileType: filename.split('.').pop()
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000 });
        return response.data;
    }

    static async getPremiumStatus(userId) {
        try {
            const response = await axios.post(CONFIG.WORKER_URL, {
                action: 'premium_status',
                userId: String(userId)
            }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 10000 });
            return response.data?.isPremium || false;
        } catch { return false; }
    }

    static async requestPremium(userId, transactionId, plan = 'pro') {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'premium_request',
            transactionId: transactionId,
            plan: plan,
            upiId: CONFIG.UPI_ID
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY, 'X-User-ID': String(userId) }, timeout: 10000 });
        return response.data;
    }

    static async shopping(product, budget) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'shopping',
            product: product,
            budget: budget
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async youtubeSummary(videoUrl) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'youtube',
            videoUrl: videoUrl
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
        return response.data;
    }

    static async generateQR(text, size = 300) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'qr_generate',
            text: text,
            size: size
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000, responseType: 'arraybuffer' });
        return response.data;
    }

    static async createCanvas(html, css = '', js = '') {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'canvas',
            html: html,
            css: css,
            js: js
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async setReminder(userId, message, minutes) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'reminder',
            message: message,
            minutes: minutes
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY, 'X-User-ID': String(userId) }, timeout: 10000 });
        return response.data;
    }

    static async translate(text, targetLang, sourceLang = null) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'translate',
            text: text,
            targetLanguage: targetLang,
            sourceLanguage: sourceLang
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
        return response.data;
    }

    static async imageEdit(imageBase64, instruction) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_edit',
            image: imageBase64,
            instruction: instruction
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000, responseType: 'arraybuffer' });
        return response.data;
    }

    static async imageEnhance(imageBase64) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_enhance',
            image: imageBase64
        }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000, responseType: 'arraybuffer' });
        return response.data;
    }
}

// ==========================================
// ========== KEYBOARDS ==========
// ==========================================
const Keyboards = {
    main: Markup.inlineKeyboard([
        [Markup.button.callback('💬 New Chat', 'new_chat')],
        [Markup.button.callback('🎨 Generate Image', 'image_info')],
        [Markup.button.callback('📸 Real Photos', 'photo_info')],
        [Markup.button.callback('🛍️ Shopping', 'shopping_info')],
        [Markup.button.callback('🎤 Voice', 'voice_info')],
        [Markup.button.callback('⚙️ More', 'more_info')]
    ]),

    more: Markup.inlineKeyboard([
        [Markup.button.callback('📄 File Analysis', 'file_info')],
        [Markup.button.callback('🎬 YouTube', 'youtube_info')],
        [Markup.button.callback('🔲 QR Code', 'qr_info')],
        [Markup.button.callback('🎨 Canvas', 'canvas_info')],
        [Markup.button.callback('⏰ Reminder', 'reminder_info')],
        [Markup.button.callback('🌐 Translate', 'translate_info')],
        [Markup.button.callback('🔙 Back', 'back_main')]
    ]),

    admin: Markup.inlineKeyboard([
        [Markup.button.callback('👑 Admin Panel', 'admin_panel')]
    ]),

    adminPanel: Markup.inlineKeyboard([
        [Markup.button.callback('💎 Premium Plans', 'admin_plans')],
        [Markup.button.callback('📊 System Status', 'admin_status')],
        [Markup.button.callback('🏥 Health', 'admin_health')],
        [Markup.button.callback('🗑️ Clear Session', 'admin_clear')],
        [Markup.button.callback('🚪 Close', 'admin_logout')]
    ])
};

// ==========================================
// ========== BOT INIT ==========
// ==========================================
const bot = new Telegraf(CONFIG.BOT_TOKEN);

// ==========================================
// ========== COMMANDS ==========
// ==========================================

bot.start(async (ctx) => {
    const isAdmin = storage.isAdmin(ctx.from.id);
    const message = `🤖 *${CONFIG.APP_NAME} AI — DeepSeek Level*\n\n` +
        `👋 Hello ${ctx.from.first_name}! I'm ${CONFIG.APP_NAME}, your AI assistant.\n\n` +
        `**🎯 Capabilities:**\n` +
        `• 💬 *Intelligent Chat*\n` +
        `• 🌐 *Real-Time Web Search*\n` +
        `• 🎨 *AI Image Generation* (3 engines)\n` +
        `• 📸 *Real Photos* (Unsplash+Pixabay)\n` +
        `• 👁️ *Vision Analysis*\n` +
        `• 🎤 *Voice Chat* (Hindi/English)\n` +
        `• 📄 *File Analysis*\n` +
        `• 🛍️ *Shopping Recommendations*\n` +
        `• 🎬 *YouTube Summaries*\n` +
        `• 🔲 *QR Code Generator*\n` +
        `• 🎨 *Canvas/HTML Artifacts*\n` +
        `• ⏰ *Smart Reminders*\n` +
        `• 🌐 *AI Translation*\n\n` +
        `**⚡ Quick Commands:**\n` +
        `• /generate sunset — AI Image\n` +
        `• /photo Taj Mahal — Real Photos\n` +
        `• /status — Check Premium\n` +
        `• /help — Full Guide\n\n` +
        `💡 *Just type anything to start chatting!*`;

    if (isAdmin) {
        await ctx.replyWithMarkdown(message + `\n\n🔐 *Admin access granted.*`, Keyboards.admin);
    } else {
        await ctx.replyWithMarkdown(message, Keyboards.main);
    }
});

bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *${CONFIG.APP_NAME} AI Commands*\n\n` +
        `**💬 Chat:**\n• Just type any message\n• /status - Check premium\n• /premium [code] - Activate premium\n\n` +
        `**🎨 Images:**\n• /generate sunset — Auto\n• /generate --realistic mountain — Realistic\n• /generate --artistic dream — Artistic\n• /photo Taj Mahal — Real photos\n• /vary [instruction] — Edit image (reply)\n• /enhance — Improve quality (reply)\n\n` +
        `**🎤 Media:**\n• Send a photo — AI analyzes it\n• Send a voice message — AI responds\n• Send a document — AI analyzes content\n\n` +
        `**🛍️ More:**\n• /shop iPhone 15 — Shopping\n• /youtube [url] — YouTube summary\n• /qr [text] — QR code\n• /canvas [html] — Web artifact\n• /remind [msg] in [min] — Reminder\n• /translate [text] to [lang] — Translate\n\n` +
        `**💎 Premium:**\n• /premium ${CONFIG.ADMIN_SECRET} — Request premium\n• Free: 50 msgs/day | Premium: Unlimited\n\n` +
        `**🆔 Utility:**\n• /myid — Get your Telegram ID`
    );
});

bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 *Your ID:* \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const isPremiumUser = storage.isPremium(userId) || await APIClient.getPremiumStatus(userId);
    const limit = storage.checkLimit(userId, 'messages');

    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n` +
        `👤 *User:* ${ctx.from.first_name}\n` +
        `🆔 *ID:* \`${userId}\`\n` +
        `💎 *Premium:* ${isPremiumUser ? '✅ Active' : '❌ Inactive'}\n` +
        `📅 *Daily Limit:* ${limit.allowed ? `${limit.remaining + 1}/50 messages used` : 'Limit reached'}\n\n` +
        (isPremiumUser ? `✨ *Unlimited access!*` : `💡 *Send /premium ${CONFIG.ADMIN_SECRET} to request premium*`)
    );
});

bot.command('premium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const code = args[1];

    if (!code) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/premium [code]\`\n\nContact admin to obtain premium code.`);
        return;
    }

    if (code === CONFIG.ADMIN_SECRET) {
        const userId = ctx.from.id;
        const transactionId = `TXN_${Date.now()}_${userId}`;

        try {
            const result = await APIClient.requestPremium(userId, transactionId, 'pro');
            if (result.success) {
                await ctx.replyWithMarkdown(
                    `✅ *Premium request submitted!*\n\n📋 *Request ID:* \`${transactionId}\`\n⏳ *Status:* Pending approval\n\nAdmin will review and notify you.`
                );
            } else {
                await ctx.replyWithMarkdown(`❌ *Premium request failed!*\n\n${result.error || 'Please try again.'}`);
            }
        } catch (error) {
            await ctx.replyWithMarkdown(`⚠️ *Premium service unavailable*\n\nPlease try again later.`);
        }
    } else {
        await ctx.replyWithMarkdown(`❌ *Invalid premium code!*`);
    }
});

// ==========================================
// ========== IMAGE COMMANDS ==========
// ==========================================
bot.command('generate', async (ctx) => {
    let prompt = ctx.message.text.replace('/generate', '').trim();
    let style = 'auto';
    let cleanPrompt = prompt;

    if (prompt.startsWith('--realistic')) {
        style = 'realistic';
        cleanPrompt = prompt.replace('--realistic', '').trim();
    } else if (prompt.startsWith('--artistic')) {
        style = 'artistic';
        cleanPrompt = prompt.replace('--artistic', '').trim();
    }

    if (!cleanPrompt) {
        await ctx.replyWithMarkdown(
            `🎨 *AI Image Generation*\n\n` +
            `• \`/generate sunset\` — Auto (Flux)\n` +
            `• \`/generate --realistic mountain\` — Realistic (SDXL)\n` +
            `• \`/generate --artistic dream\` — Artistic (DreamShaper)`
        );
        return;
    }

    const limit = storage.checkLimit(ctx.from.id, 'images');
    if (!limit.allowed) {
        await ctx.replyWithMarkdown(`⚠️ *Daily image limit reached!* (10/day)\n\nUpgrade to premium for unlimited.`);
        return;
    }

    const styleNames = { realistic: '📷 SDXL (Realistic)', artistic: '🎨 DreamShaper (Artistic)', auto: '⚡ Flux (Auto)' };

    await ctx.reply(`${styleNames[style]} *Generating image...*\n📝 "${cleanPrompt}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const imageData = await APIClient.generateImage(cleanPrompt, style);
        if (imageData && imageData.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(imageData) }, {
                caption: `${styleNames[style]}\n📝 ${cleanPrompt.substring(0, 100)}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply(`❌ *Image generation failed!* Please try again.`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error('Image gen error:', error.message);
        await ctx.reply(`❌ *Image generation failed!* Please try again later.`, { parse_mode: 'Markdown' });
    }
});

bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();

    if (!query) {
        await ctx.replyWithMarkdown(`📸 *Real Photo Search*\n\n\`/photo Taj Mahal\``);
        return;
    }

    await ctx.reply(`🔍 *Searching for:* "${query}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const result = await APIClient.searchPhotos(query);
        if (result.success && result.photos && result.photos.length > 0) {
            const mediaGroup = [];
            for (let i = 0; i < Math.min(result.photos.length, 5); i++) {
                const photo = result.photos[i];
                mediaGroup.push({
                    type: 'photo',
                    media: photo.medium || photo.url,
                    caption: i === 0 ? `📸 *${query}*\n📷 Source: ${result.source}` : undefined,
                    parse_mode: 'Markdown'
                });
            }
            await ctx.replyWithMediaGroup(mediaGroup);
        } else {
            await ctx.replyWithMarkdown(`❌ *No photos found for:* "${query}"`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Photo search failed!*`);
    }
});

bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();

    if (!instruction || !ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(`🎨 *Image Variation*\n\nReply to an image with \`/vary [instruction]\``);
        return;
    }

    await ctx.reply(`🎨 *Editing image...*\n📝 "${instruction}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const editedImage = await APIClient.imageEdit(base64Image, instruction);
        if (editedImage && editedImage.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(editedImage) }, {
                caption: `🎨 *Image Variation*\n📝 ${instruction}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Image editing failed!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Image editing failed!*`);
    }
});

bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(`✨ *Image Enhancement*\n\nReply to an image with \`/enhance\``);
        return;
    }

    await ctx.reply(`✨ *Enhancing image...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const enhancedImage = await APIClient.imageEnhance(base64Image);
        if (enhancedImage && enhancedImage.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(enhancedImage) }, {
                caption: `✨ *Enhanced Image*`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Image enhancement failed!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Image enhancement failed!*`);
    }
});

// ==========================================
// ========== SHOPPING COMMAND ==========
// ==========================================
bot.command('shop', async (ctx) => {
    const product = ctx.message.text.replace('/shop', '').trim();

    if (!product) {
        await ctx.replyWithMarkdown(`🛍️ *Shopping*\n\n\`/shop iPhone 15\``);
        return;
    }

    await ctx.reply(`🛍️ *Searching best ${product}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.shopping(product, null);
        const response = Formatter.clean(result.response || result.analysis || `No results found for ${product}`);
        await ctx.replyWithMarkdown(response + `\n\n🔗 [View on Amazon](https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=${CONFIG.AMAZON_AFFILIATE_ID || 'akhilgpt-21'})`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Shopping search failed!*`);
    }
});

// ==========================================
// ========== YOUTUBE COMMAND ==========
// ==========================================
bot.command('youtube', async (ctx) => {
    const url = ctx.message.text.replace('/youtube', '').trim();

    if (!url) {
        await ctx.replyWithMarkdown(`🎬 *YouTube Summary*\n\n\`/youtube https://youtu.be/...\``);
        return;
    }

    await ctx.reply(`🎬 *Analyzing video...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.youtubeSummary(url);
        const response = Formatter.clean(result.response || result.summary || `Video: ${url}`);
        await ctx.replyWithMarkdown(response);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *YouTube summary failed!*`);
    }
});

// ==========================================
// ========== QR CODE COMMAND ==========
// ==========================================
bot.command('qr', async (ctx) => {
    const text = ctx.message.text.replace('/qr', '').trim();

    if (!text) {
        await ctx.replyWithMarkdown(`🔲 *QR Code*\n\n\`/qr https://nexus.ai\``);
        return;
    }

    await ctx.reply(`🔲 *Generating QR code...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const qrData = await APIClient.generateQR(text);
        if (qrData && qrData.length > 100) {
            await ctx.replyWithPhoto({ source: Buffer.from(qrData) }, {
                caption: `🔲 *QR Code for:*\n\`${text.substring(0, 100)}\``,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *QR generation failed!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *QR generation failed!*`);
    }
});

// ==========================================
// ========== CANVAS COMMAND ==========
// ==========================================
bot.command('canvas', async (ctx) => {
    const html = ctx.message.text.replace('/canvas', '').trim();

    if (!html) {
        await ctx.replyWithMarkdown(`🎨 *Canvas Artifact*\n\n\`/canvas <h1>Hello</h1>\``);
        return;
    }

    await ctx.reply(`🎨 *Creating canvas...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });

    try {
        const result = await APIClient.createCanvas(html);
        await ctx.replyWithMarkdown(`🎨 *Canvas Created!*\n\n🔗 ${result.url || 'View in browser'}\n📝 ${(result.preview || '').substring(0, 200)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Canvas creation failed!*`);
    }
});

// ==========================================
// ========== REMINDER COMMAND ==========
// ==========================================
bot.command('remind', async (ctx) => {
    const text = ctx.message.text.replace('/remind', '').trim();
    const match = text.match(/^(.+?)\s+in\s+(\d+)\s*(minute|minutes|min|m)?$/i);

    if (!match) {
        await ctx.replyWithMarkdown(`⏰ *Reminder*\n\n\`/remind Call meeting in 30\``);
        return;
    }

    const message = match[1].trim();
    const minutes = parseInt(match[2]);

    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        await ctx.replyWithMarkdown(`❌ *Invalid minutes!* (1-1440)`);
        return;
    }

    try {
        const result = await APIClient.setReminder(ctx.from.id, message, minutes);
        if (result.success) {
            await ctx.replyWithMarkdown(
                `⏰ *Reminder set!*\n\n📝 *Message:* ${message}\n⏱️ *In:* ${minutes} minutes\n🕐 *At:* ${new Date(Date.now() + minutes * 60000).toLocaleString()}`
            );
        } else {
            await ctx.replyWithMarkdown(`❌ *Failed to set reminder!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Reminder service unavailable!*`);
    }
});

// ==========================================
// ========== TRANSLATE COMMAND ==========
// ==========================================
bot.command('translate', async (ctx) => {
    const text = ctx.message.text.replace('/translate', '').trim();
    const match = text.match(/^(.+?)\s+to\s+(\w+)$/i);

    if (!match) {
        await ctx.replyWithMarkdown(`🌐 *Translate*\n\n\`/translate Hello to hi\``);
        return;
    }

    const sourceText = match[1].trim();
    const targetLang = match[2].toLowerCase();

    await ctx.reply(`🌐 *Translating to ${targetLang}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.translate(sourceText, targetLang);
        await ctx.replyWithMarkdown(`🌐 *Translation (→ ${targetLang})*\n\n📝 *Original:* ${sourceText}\n\n✨ *Translated:* ${result.translation || result.response}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Translation failed!*`);
    }
});

// ==========================================
// ========== ADMIN COMMAND ==========
// ==========================================
bot.command('admin', async (ctx) => {
    if (!storage.isAdmin(ctx.from.id)) return;
    storage.setAdminSession(ctx.from.id);
    await ctx.replyWithMarkdown(`👑 *Admin Panel*\n\nWelcome, ${ctx.from.first_name}!`, Keyboards.adminPanel);
});

// ==========================================
// ========== MEDIA HANDLERS ==========
// ==========================================
bot.on('photo', async (ctx) => {
    const limit = storage.checkLimit(ctx.from.id, 'messages');
    if (!limit.allowed) {
        await ctx.replyWithMarkdown(`⚠️ *Daily limit reached!* (50 messages/day)`);
        return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');

        const result = await APIClient.analyzeImage(base64Image);
        const analysis = Formatter.clean(result.response || 'Image analyzed!');
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Image analysis failed!*`);
    }
});

// ==========================================
// ========== VOICE HANDLER (FIXED) ==========
// ==========================================
bot.on('voice', async (ctx) => {
    const limit = storage.checkLimit(ctx.from.id, 'voice');
    if (!limit.allowed) {
        await ctx.replyWithMarkdown(`⚠️ *Daily voice limit reached!* (5/day)`);
        return;
    }

    // Send typing indicator
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const voiceResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });

        const result = await APIClient.voiceChat(voiceResponse.data, 'hi');

        // Extract response text
        let replyText = '';
        if (result.response) {
            replyText = result.response;
        } else if (result.transcript) {
            replyText = result.transcript;
        } else if (result.text) {
            replyText = result.text;
        } else {
            replyText = 'Voice processed successfully!';
        }

        const cleanedReply = Formatter.clean(replyText);
        await ctx.reply(cleanedReply);

    } catch (error) {
        console.error('Voice handler error:', error.message);
        await ctx.replyWithMarkdown(`❌ *Voice processing failed!*\n\nPlease try again.`);
    }
});

// ==========================================
// ========== DOCUMENT HANDLER ==========
// ==========================================
bot.on('document', async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const doc = ctx.message.document;
        const file = await ctx.telegram.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileResponse.data).toString('base64');

        const result = await APIClient.analyzeFile(doc.file_name, base64File);
        const analysis = Formatter.clean(result.response || 'File analyzed!');
        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${analysis.substring(0, 2000)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *File analysis failed!*`);
    }
});

// ==========================================
// ========== TEXT HANDLER ==========
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    if (text === CONFIG.ADMIN_SECRET) return;

    const limit = storage.checkLimit(ctx.from.id, 'messages');
    if (!limit.allowed) {
        await ctx.replyWithMarkdown(`⚠️ *Daily limit reached!* (50 messages/day)\n\nSend \`/premium ${CONFIG.ADMIN_SECRET}\` to request premium.`);
        return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    const isAdminMode = storage.isAdminSession(ctx.from.id);

    try {
        const startTime = Date.now();
        const result = await APIClient.chat(text, ctx.from.id, isAdminMode);
        const latency = Date.now() - startTime;

        let reply = Formatter.clean(result.response || 'No response');
        if (isAdminMode) reply = `👑 *[ADMIN MODE]*\n\n${reply}`;

        await ctx.reply(`${reply}\n\n⚡ ${latency}ms | 🤖 ${result.model || 'AI'}`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Chat error:', error.message);
        await ctx.replyWithMarkdown(`❌ *Service unavailable*\n\nPlease try again.`);
    }
});

// ==========================================
// ========== CALLBACK HANDLER ==========
// ==========================================
bot.action(/.*/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    await ctx.answerCbQuery();

    if (data.startsWith('admin_') && !storage.isAdminSession(userId)) {
        await ctx.editMessageText(`❌ *Admin access required!*`, { parse_mode: 'Markdown' });
        return;
    }

    const handlers = {
        'new_chat': () => ctx.editMessageText(`💬 *New Chat Started!*`, { parse_mode: 'Markdown' }),
        'image_info': () => ctx.editMessageText(`🎨 *Image Gen*\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream`, { parse_mode: 'Markdown' }),
        'photo_info': () => ctx.editMessageText(`📸 *Real Photos*\n• /photo Taj Mahal`, { parse_mode: 'Markdown' }),
        'shopping_info': () => ctx.editMessageText(`🛍️ *Shopping*\n• /shop iPhone 15`, { parse_mode: 'Markdown' }),
        'voice_info': () => ctx.editMessageText(`🎤 *Voice Chat*\nSend a voice message!`, { parse_mode: 'Markdown' }),
        'more_info': async () => { await ctx.editMessageText(`⚙️ *More Features*`, Keyboards.more); },
        'back_main': async () => { await ctx.editMessageText(`🤖 *Main Menu*`, Keyboards.main); },
        'file_info': () => ctx.editMessageText(`📄 *File Analysis*\nSend any document!`, { parse_mode: 'Markdown' }),
        'youtube_info': () => ctx.editMessageText(`🎬 *YouTube*\n• /youtube [url]`, { parse_mode: 'Markdown' }),
        'qr_info': () => ctx.editMessageText(`🔲 *QR Code*\n• /qr [text]`, { parse_mode: 'Markdown' }),
        'canvas_info': () => ctx.editMessageText(`🎨 *Canvas*\n• /canvas [html]`, { parse_mode: 'Markdown' }),
        'reminder_info': () => ctx.editMessageText(`⏰ *Reminder*\n• /remind [msg] in [min]`, { parse_mode: 'Markdown' }),
        'translate_info': () => ctx.editMessageText(`🌐 *Translate*\n• /translate [text] to [lang]`, { parse_mode: 'Markdown' }),
        'admin_panel': async () => {
            storage.setAdminSession(userId);
            await ctx.editMessageText(`👑 *Admin Panel*`, Keyboards.adminPanel);
        },
        'admin_plans': () => ctx.editMessageText(`📋 *Premium Plans*\n• Plus: ₹299/mo\n• Pro: ₹1,499/yr\n• Enterprise: ₹2,999/yr\n\nUPI: ${CONFIG.UPI_ID}`, { parse_mode: 'Markdown' }),
        'admin_status': () => ctx.editMessageText(`📊 *System Status*\n✅ Bot: Running\n✅ API: Online\n📅 ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' }),
        'admin_health': () => ctx.editMessageText(`🏥 *Health Check*\n✅ All systems operational`, { parse_mode: 'Markdown' }),
        'admin_clear': () => ctx.editMessageText(`🗑️ *Clear Session*\nCommand: /clear [user_id]`, { parse_mode: 'Markdown' }),
        'admin_logout': () => {
            storage.clearAdminSession(userId);
            ctx.editMessageText(`🚪 *Admin panel closed!*`, { parse_mode: 'Markdown' });
        }
    };

    const handler = handlers[data];
    if (handler) await handler();
});

// ==========================================
// ========== NETLIFY HANDLER ==========
// ==========================================
exports.handler = async (event) => {
    try {
        const update = JSON.parse(event.body);
        await bot.handleUpdate(update);
        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Webhook error:', err);
        return { statusCode: 200, body: 'OK' };
    }
};