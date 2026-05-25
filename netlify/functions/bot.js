// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - ENTERPRISE PRODUCTION                              ║
// ║  Fully compatible with MONSTER AI v8.0 Worker                               ║
// ║  28 Actions | 6 AI Models | 3 Image Engines | Voice | Premium | Slack       ║
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
// ========== STORAGE LAYER ==========
// ==========================================
class Storage {
    constructor() {
        this.adminSessions = new Map();
        this.premiumUsers = new Map();
        this.usageTracker = new Map();
        this.streamingControllers = new Map();
        this.streamingMessages = new Map();
    }

    isAdmin(userId) { return CONFIG.ADMIN_IDS.has(userId); }
    isPremium(userId) { return this.premiumUsers.has(userId); }
    activatePremium(userId) { this.premiumUsers.set(userId, true); }
    revokePremium(userId) { return this.premiumUsers.delete(userId); }
    isAdminSession(userId) { return this.adminSessions.has(userId); }
    createAdminSession(userId, data) { this.adminSessions.set(userId, { ...data, createdAt: Date.now() }); }
    destroyAdminSession(userId) { return this.adminSessions.delete(userId); }

    checkRateLimit(userId, type) {
        const isPremiumUser = this.isPremium(userId) || this.isAdmin(userId);
        const limits = isPremiumUser ? { messages: Infinity, images: Infinity, voice: Infinity } : { messages: 50, images: 10, voice: 5 };
        const limit = limits[type] || 50;
        if (limit === Infinity) return { allowed: true, remaining: Infinity };

        const today = new Date().toISOString().split('T')[0];
        const key = `${userId}:${type}:${today}`;
        const current = this.usageTracker.get(key) || 0;
        if (current >= limit) return { allowed: false, remaining: 0, limit };
        this.usageTracker.set(key, current + 1);
        setTimeout(() => { if (this.usageTracker.get(key) === current + 1) this.usageTracker.delete(key); }, 86400000);
        return { allowed: true, remaining: limit - current - 1, limit };
    }

    setStreamingController(chatId, controller) { this.streamingControllers.set(chatId, controller); }
    clearStreamingController(chatId) {
        const controller = this.streamingControllers.get(chatId);
        if (controller) { controller.abort(); this.streamingControllers.delete(chatId); }
        this.streamingMessages.delete(chatId);
    }
    setStreamingMessage(chatId, messageId) { this.streamingMessages.set(chatId, messageId); }
    getStreamingMessage(chatId) { return this.streamingMessages.get(chatId); }
    getStats() { return { adminSessions: this.adminSessions.size, premiumUsers: this.premiumUsers.size, activeStreams: this.streamingControllers.size, totalTracked: this.usageTracker.size }; }
}

const storage = new Storage();

// ==========================================
// ========== RESPONSE FORMATTER ==========
// ==========================================
class ResponseFormatter {
    static cleanMarkdown(text) {
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

    static formatResponse(response, model, latency, isAdminMode) {
        let text = this.cleanMarkdown(response);
        if (isAdminMode) text = `👑 *[ADMIN MODE]*\n\n${text}`;
        return `${text}\n\n⚡ ${latency}ms | 🤖 ${model}`;
    }

    static formatError(error, isAdminMode = false) {
        const prefix = isAdminMode ? '👑 *[ADMIN MODE]*\n\n' : '';
        return `${prefix}❌ *Error:* ${error.message || error}\n\nPlease try again later.`;
    }

    static formatLimitWarning(limit, type) {
        return `⚠️ *Daily ${type} limit reached!* (${limit}/${type})\n\nUpgrade to premium for unlimited access.`;
    }
}

// ==========================================
// ========== STREAMING ENGINE ==========
// ==========================================
class StreamingEngine {
    static async streamResponse(message, ctx, isAdminMode = false) {
        const chatId = ctx.chat.id;
        const startTime = Date.now();

        const initialMessage = await ctx.reply("🧠 *Processing your request...*", { parse_mode: 'Markdown' });
        let currentMessageId = initialMessage.message_id;
        storage.setStreamingMessage(chatId, currentMessageId);

        const abortController = new AbortController();
        storage.setStreamingController(chatId, abortController);

        let fullResponse = '';
        let lastUpdateTime = Date.now();
        let pendingUpdate = false;

        try {
            const response = await fetch(CONFIG.WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': CONFIG.API_KEY,
                    'X-Stream-Mode': 'word',
                    ...(isAdminMode && { 'X-User-ID': 'akhil' })
                },
                body: JSON.stringify({ action: 'chat', message: message }),
                signal: abortController.signal
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        if (dataStr === '[DONE]') {
                            const cleanedResponse = ResponseFormatter.cleanMarkdown(fullResponse);
                            const finalText = isAdminMode ? `👑 *[ADMIN MODE]*\n\n${cleanedResponse}` : cleanedResponse;
                            const latency = Date.now() - startTime;
                            await ctx.telegram.editMessageText(chatId, currentMessageId, null, `${finalText}\n\n⚡ ${latency}ms | 🤖 AI`, { parse_mode: 'Markdown' });
                            return;
                        }

                        try {
                            const data = JSON.parse(dataStr);
                            switch (data.type) {
                                case 'chunk':
                                    if (data.text) {
                                        fullResponse += data.text;
                                        const now = Date.now();
                                        if (!pendingUpdate && (now - lastUpdateTime) >= 500) {
                                            pendingUpdate = true;
                                            const preview = fullResponse.length > 800 ? fullResponse.substring(0, 800) + '...' : fullResponse;
                                            const cleanedPreview = ResponseFormatter.cleanMarkdown(preview);
                                            try {
                                                await ctx.telegram.editMessageText(chatId, currentMessageId, null, `🤖 *Generating...*\n\n${cleanedPreview}`, { parse_mode: 'Markdown' });
                                                lastUpdateTime = now;
                                            } catch (editError) {
                                                if (editError.response?.statusCode === 400) {
                                                    const newMessage = await ctx.reply(`🤖 *Continuing...*\n\n${cleanedPreview}`, { parse_mode: 'Markdown' });
                                                    currentMessageId = newMessage.message_id;
                                                    storage.setStreamingMessage(chatId, currentMessageId);
                                                }
                                            }
                                            pendingUpdate = false;
                                        }
                                    }
                                    break;
                                case 'thinking':
                                    try { await ctx.telegram.editMessageText(chatId, currentMessageId, null, `🧠 *${data.reason || 'Thinking...'}*`, { parse_mode: 'Markdown' }); } catch (e) {}
                                    break;
                                case 'search':
                                    try { await ctx.telegram.editMessageText(chatId, currentMessageId, null, `🔍 *Searching: ${data.source || 'Web'}*\n${data.snippet || 'Gathering information...'}`, { parse_mode: 'Markdown' }); } catch (e) {}
                                    break;
                                case 'error': throw new Error(data.error);
                            }
                        } catch (parseError) { console.error('Stream parse error:', parseError); }
                    }
                }
            }

            if (fullResponse) {
                const cleanedResponse = ResponseFormatter.cleanMarkdown(fullResponse);
                const finalText = isAdminMode ? `👑 *[ADMIN MODE]*\n\n${cleanedResponse}` : cleanedResponse;
                const latency = Date.now() - startTime;
                await ctx.telegram.editMessageText(chatId, currentMessageId, null, `${finalText}\n\n⚡ ${latency}ms | 🤖 AI`, { parse_mode: 'Markdown' });
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                await ctx.telegram.editMessageText(chatId, currentMessageId, null, `⏹️ *Streaming stopped*`, { parse_mode: 'Markdown' });
            } else {
                console.error('Streaming error:', error);
                await ctx.telegram.editMessageText(chatId, currentMessageId, null, ResponseFormatter.formatError(error, isAdminMode), { parse_mode: 'Markdown' });
            }
        } finally {
            storage.clearStreamingController(chatId);
            storage.streamingMessages.delete(chatId);
        }
    }
}

// ==========================================
// ========== API CLIENT ==========
// ==========================================
class APIClient {
    static async callWorker(action, payload = {}, isAdmin = false, responseType = 'json') {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (isAdmin) headers['X-User-ID'] = 'akhil';

        const response = await axios.post(CONFIG.WORKER_URL, { action, ...payload }, { headers, timeout: 120000, responseType });
        return response.data;
    }

    static async generateImage(prompt, style = 'auto') {
        const styleMap = { realistic: 'photorealistic', artistic: 'artistic', auto: 'auto' };
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'image_generate', prompt, style: styleMap[style] || 'auto' }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 120000, responseType: 'arraybuffer' });
        return response.data;
    }

    static async searchPhotos(query) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'real_photo', query, per_page: 5 }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
        return response.data;
    }

    static async analyzeImage(base64Image) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'chat', image: base64Image, message: 'Describe this image' }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async voiceChat(audioBuffer, language = 'hi') {
        const formData = new FormData();
        formData.append('audio', Buffer.from(audioBuffer), { filename: 'voice.ogg', contentType: 'audio/ogg' });
        formData.append('language', language);
        const response = await axios.post(CONFIG.VOICE_URL, formData, { headers: { ...formData.getHeaders(), 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async analyzeFile(filename, content) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'file_analysis', fileContent: content, fileType: filename.split('.').pop() }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000 });
        return response.data;
    }

    static async getPremiumStatus(userId) {
        try {
            const response = await axios.post(CONFIG.WORKER_URL, { action: 'premium_status', userId: String(userId) }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 10000 });
            return response.data?.isPremium || false;
        } catch { return false; }
    }

    static async requestPremium(userId, transactionId, plan = 'pro') {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'premium_request', transactionId, plan, upiId: CONFIG.UPI_ID }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY, 'X-User-ID': String(userId) }, timeout: 10000 });
        return response.data;
    }

    static async getPremiumPlans() {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'premium_plans' }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 10000 });
        return response.data;
    }

    static async shopping(product, budget) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'shopping', product, budget }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async youtubeSummary(videoUrl) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'youtube', videoUrl }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
        return response.data;
    }

    static async generateQR(text, size = 300) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'qr_generate', text, size }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000, responseType: 'arraybuffer' });
        return response.data;
    }

    static async createCanvas(html, css = '', js = '') {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'canvas', html, css, js }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 60000 });
        return response.data;
    }

    static async setReminder(userId, message, minutes) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'reminder', message, minutes }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY, 'X-User-ID': String(userId) }, timeout: 10000 });
        return response.data;
    }

    static async translate(text, targetLang, sourceLang = null) {
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'translate', text, targetLanguage: targetLang, sourceLanguage: sourceLang }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 30000 });
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
        [Markup.button.callback('🎬 YouTube Summary', 'youtube_info')],
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
        [Markup.button.callback('🏥 Health Check', 'admin_health')],
        [Markup.button.callback('🗑️ Clear Session', 'admin_clear')],
        [Markup.button.callback('🚪 Close Panel', 'admin_logout')]
    ])
};

// ==========================================
// ========== BOT INITIALIZATION ==========
// ==========================================
const bot = new Telegraf(CONFIG.BOT_TOKEN);

// ==========================================
// ========== CORE COMMANDS ==========
// ==========================================
bot.start(async (ctx) => {
    const isAdmin = storage.isAdmin(ctx.from.id);
    let message = `🤖 *${CONFIG.APP_NAME} AI — Enterprise Edition*\n\n` +
        `👋 Hello ${ctx.from.first_name}! I'm ${CONFIG.APP_NAME}, your AI assistant.\n\n` +
        `**🎯 Capabilities:**\n` +
        `• 💬 *Intelligent Chat* (Word-by-word streaming)\n` +
        `• 🌐 *Real-Time Web Search*\n` +
        `• 🎨 *AI Image Generation* (Flux/SDXL/DreamShaper)\n` +
        `• 📸 *Real Photo Search* (Unsplash+Pixabay)\n` +
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

    if (isAdmin) await ctx.replyWithMarkdown(message + `\n\n🔐 *Admin access granted.*`, Keyboards.admin);
    else await ctx.replyWithMarkdown(message, Keyboards.main);
});

bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *${CONFIG.APP_NAME} AI — Complete Guide*\n\n` +
        `**💬 Chat:**\n• Type any message — AI responds with streaming\n• /cancel — Stop current response\n• /status — Check premium status\n\n` +
        `**🎨 Images:**\n• /generate [prompt] — Auto mode\n• /generate --realistic [prompt] — Photorealistic\n• /generate --artistic [prompt] — Artistic\n• /photo [query] — Search real photos\n• /vary [instruction] — Edit image (reply to photo)\n• /enhance — Improve quality (reply to photo)\n\n` +
        `**🎤 Media:**\n• Send a photo — AI analyzes it\n• Send a voice message — AI transcribes & responds\n• Send a document — AI analyzes content\n\n` +
        `**🛍️ Shopping & More:**\n• /shop [product] — Get recommendations\n• /youtube [url] — Get video summary\n• /qr [text] — Generate QR code\n• /canvas [html] — Create web artifact\n• /remind [message] in [minutes] — Set reminder\n• /translate [text] to [lang] — Translate\n\n` +
        `**💎 Premium:**\n• /premium [code] — Activate premium\n• Free: 50 msgs/day | Premium: Unlimited\n\n` +
        `**🆔 Utility:**\n• /myid — Get your Telegram ID\n• /help — Show this menu`
    );
});

bot.command('cancel', async (ctx) => {
    storage.clearStreamingController(ctx.chat.id);
    await ctx.reply(`⏹️ *Response stopped*`, { parse_mode: 'Markdown' });
});

bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 *Your Telegram ID:* \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const workerPremium = await APIClient.getPremiumStatus(userId);
    const localPremium = storage.isPremium(userId);
    const isPremiumUser = workerPremium || localPremium;
    const rateLimit = storage.checkRateLimit(userId, 'messages');
    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n👤 *User:* ${ctx.from.first_name}\n🆔 *ID:* \`${userId}\`\n💎 *Premium:* ${isPremiumUser ? '✅ Active' : '❌ Inactive'}\n📅 *Today's Usage:* ${rateLimit.limit === Infinity ? 'Unlimited' : `${50 - (rateLimit.remaining + 1)}/50 messages`}\n\n${isPremiumUser ? `✨ *Unlimited access activated!*` : `💡 *Send /premium ${CONFIG.ADMIN_SECRET} to request premium*`}`
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
                    `✅ *Premium request submitted!*\n\n📋 *Request ID:* \`${transactionId}\`\n⏳ *Status:* Pending approval\n\nAdmin will review your request and notify you.`
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
    if (prompt.startsWith('--realistic')) { style = 'realistic'; cleanPrompt = prompt.replace('--realistic', '').trim(); }
    else if (prompt.startsWith('--artistic')) { style = 'artistic'; cleanPrompt = prompt.replace('--artistic', '').trim(); }

    if (!cleanPrompt) {
        await ctx.replyWithMarkdown(`🎨 *AI Image Generation*\n\n*Usage:*\n• \`/generate sunset\` — Auto (Flux)\n• \`/generate --realistic mountain\` — Realistic (SDXL)\n• \`/generate --artistic dream\` — Artistic (DreamShaper)`);
        return;
    }

    const rateLimit = storage.checkRateLimit(ctx.from.id, 'images');
    if (!rateLimit.allowed) { await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'images')); return; }

    const styleNames = { realistic: '📷 SDXL (Realistic)', artistic: '🎨 DreamShaper (Artistic)', auto: '⚡ Flux (Auto)' };
    await ctx.reply(`${styleNames[style]} *Generating image...*\n📝 "${cleanPrompt}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const imageData = await APIClient.generateImage(cleanPrompt, style);
        if (imageData && imageData.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(imageData) }, { caption: `${styleNames[style]}\n📝 ${cleanPrompt.substring(0, 100)}`, parse_mode: 'Markdown' });
        } else { await ctx.reply(`❌ *Image generation failed!* Please try again.`, { parse_mode: 'Markdown' }); }
    } catch (error) { await ctx.reply(`❌ *Image generation failed!* Please try again later.`, { parse_mode: 'Markdown' }); }
});

bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();
    if (!query) { await ctx.replyWithMarkdown(`📸 *Real Photo Search*\n\n*Usage:* \`/photo [search term]\`\n\n*Examples:* \`/photo Taj Mahal\`, \`/photo beautiful beach\``); return; }

    await ctx.reply(`🔍 *Searching real photos for:* "${query}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const result = await APIClient.searchPhotos(query);
        if (result.success && result.photos && result.photos.length > 0) {
            const mediaGroup = [];
            for (let i = 0; i < Math.min(result.photos.length, 5); i++) {
                const photo = result.photos[i];
                mediaGroup.push({ type: 'photo', media: photo.medium || photo.url, caption: i === 0 ? `📸 *${query}*\n📷 Source: ${result.source}\n🔍 ${result.total || result.photos.length} results` : undefined, parse_mode: 'Markdown' });
            }
            await ctx.replyWithMediaGroup(mediaGroup);
        } else { await ctx.replyWithMarkdown(`❌ *No photos found for:* "${query}"\n\n💡 Try different keywords or use /generate for AI images.`); }
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Photo search failed!* Please try again.`); }
});

bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();
    if (!instruction || !ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(`🎨 *Image Variation*\n\n*Usage:* Reply to an image with \`/vary [instruction]\`\n\n*Examples:* \`/vary make it more colorful\`, \`/vary add a sunset background\``);
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
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'image_edit', image: base64Image, instruction }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000, responseType: 'arraybuffer' });
        if (response.data && response.data.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, { caption: `🎨 *Image Variation*\n📝 ${instruction}`, parse_mode: 'Markdown' });
        } else { await ctx.replyWithMarkdown(`❌ *Image editing failed!* Please try again.`); }
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Image editing failed!* Please try again.`); }
});

bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(`✨ *Image Enhancement*\n\n*Usage:* Reply to an image with \`/enhance\``);
        return;
    }

    await ctx.reply(`✨ *Enhancing image quality...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const response = await axios.post(CONFIG.WORKER_URL, { action: 'image_enhance', image: base64Image }, { headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY }, timeout: 90000, responseType: 'arraybuffer' });
        if (response.data && response.data.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, { caption: `✨ *Enhanced Image*`, parse_mode: 'Markdown' });
        } else { await ctx.replyWithMarkdown(`❌ *Image enhancement failed!* Please try again.`); }
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Image enhancement failed!* Please try again.`); }
});

// ==========================================
// ========== SHOPPING COMMAND ==========
// ==========================================
bot.command('shop', async (ctx) => {
    const product = ctx.message.text.replace('/shop', '').trim();
    if (!product) { await ctx.replyWithMarkdown(`🛍️ *Shopping Recommendations*\n\n*Usage:* \`/shop [product name]\`\n\n*Example:* \`/shop iPhone 15\``); return; }

    await ctx.reply(`🛍️ *Researching best ${product} options...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.shopping(product, null);
        await ctx.replyWithMarkdown(result.response || result.analysis || `🛍️ *Recommendations for ${product}*\n\nNo results found.`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Shopping search failed!* Please try again.`); }
});

// ==========================================
// ========== YOUTUBE COMMAND ==========
// ==========================================
bot.command('youtube', async (ctx) => {
    const url = ctx.message.text.replace('/youtube', '').trim();
    if (!url) { await ctx.replyWithMarkdown(`🎬 *YouTube Summary*\n\n*Usage:* \`/youtube [video_url]\`\n\n*Example:* \`/youtube https://youtu.be/...\``); return; }

    await ctx.reply(`🎬 *Analyzing video...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.youtubeSummary(url);
        await ctx.replyWithMarkdown(result.response || result.summary || `🎬 *YouTube Video*\n\n${url}`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *YouTube summary failed!* Please try again.`); }
});

// ==========================================
// ========== QR CODE COMMAND ==========
// ==========================================
bot.command('qr', async (ctx) => {
    const text = ctx.message.text.replace('/qr', '').trim();
    if (!text) { await ctx.replyWithMarkdown(`🔲 *QR Code Generator*\n\n*Usage:* \`/qr [text or URL]\`\n\n*Example:* \`/qr https://nexus.ai\``); return; }

    await ctx.reply(`🔲 *Generating QR code...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');

    try {
        const qrData = await APIClient.generateQR(text);
        if (qrData && qrData.length > 100) {
            await ctx.replyWithPhoto({ source: Buffer.from(qrData) }, { caption: `🔲 *QR Code for:*\n\`${text.substring(0, 100)}\``, parse_mode: 'Markdown' });
        } else { await ctx.replyWithMarkdown(`❌ *QR code generation failed!*`); }
    } catch (error) { await ctx.replyWithMarkdown(`❌ *QR code generation failed!* Please try again.`); }
});

// ==========================================
// ========== CANVAS COMMAND ==========
// ==========================================
bot.command('canvas', async (ctx) => {
    const html = ctx.message.text.replace('/canvas', '').trim();
    if (!html) { await ctx.replyWithMarkdown(`🎨 *Canvas Artifact*\n\n*Usage:* \`/canvas [HTML code]\`\n\n*Example:* \`/canvas <h1>Hello World</h1>\``); return; }

    await ctx.reply(`🎨 *Creating canvas artifact...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });

    try {
        const result = await APIClient.createCanvas(html);
        await ctx.replyWithMarkdown(`🎨 *Canvas Artifact Created!*\n\n🔗 ${result.url || 'View in browser'}\n📝 Preview: ${(result.preview || '').substring(0, 200)}`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Canvas creation failed!* Please try again.`); }
});

// ==========================================
// ========== REMINDER COMMAND ==========
// ==========================================
bot.command('remind', async (ctx) => {
    const text = ctx.message.text.replace('/remind', '').trim();
    const match = text.match(/^(.+?)\s+in\s+(\d+)\s*(minute|minutes|min|m)?$/i);
    if (!match) { await ctx.replyWithMarkdown(`⏰ *Set Reminder*\n\n*Usage:* \`/remind [message] in [minutes]\`\n\n*Example:* \`/remind Call meeting in 30\``); return; }

    const message = match[1].trim();
    const minutes = parseInt(match[2]);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) { await ctx.replyWithMarkdown(`❌ *Invalid minutes!* Please use 1-1440 minutes.`); return; }

    try {
        const result = await APIClient.setReminder(ctx.from.id, message, minutes);
        if (result.success) {
            await ctx.replyWithMarkdown(`⏰ *Reminder set!*\n\n📝 *Message:* ${message}\n⏱️ *In:* ${minutes} minutes\n🕐 *At:* ${result.at || new Date(Date.now() + minutes * 60000).toLocaleString()}`);
        } else { await ctx.replyWithMarkdown(`❌ *Failed to set reminder!*`); }
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Reminder service unavailable!*`); }
});

// ==========================================
// ========== TRANSLATE COMMAND ==========
// ==========================================
bot.command('translate', async (ctx) => {
    const text = ctx.message.text.replace('/translate', '').trim();
    const match = text.match(/^(.+?)\s+to\s+(\w+)$/i);
    if (!match) { await ctx.replyWithMarkdown(`🌐 *AI Translation*\n\n*Usage:* \`/translate [text] to [language]\`\n\n*Examples:*\n• \`/translate Hello to hi\`\n• \`/translate Good morning to es\``); return; }

    const sourceText = match[1].trim();
    const targetLang = match[2].toLowerCase();

    await ctx.reply(`🌐 *Translating to ${targetLang}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const result = await APIClient.translate(sourceText, targetLang);
        await ctx.replyWithMarkdown(`🌐 *Translation (→ ${targetLang})*\n\n📝 *Original:* ${sourceText}\n\n✨ *Translated:* ${result.translation || result.response}`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Translation failed!* Please try again.`); }
});

// ==========================================
// ========== ADMIN COMMAND ==========
// ==========================================
bot.command('admin', async (ctx) => {
    if (!storage.isAdmin(ctx.from.id)) return;
    storage.createAdminSession(ctx.from.id, { username: ctx.from.first_name });
    await ctx.replyWithMarkdown(`👑 *Admin Panel*\n\nWelcome, ${ctx.from.first_name}!\n🕐 ${new Date().toLocaleString()}\n\nSelect an action:`, Keyboards.adminPanel);
});

// ==========================================
// ========== MEDIA HANDLERS ==========
// ==========================================
bot.on('photo', async (ctx) => {
    const rateLimit = storage.checkRateLimit(ctx.from.id, 'messages');
    if (!rateLimit.allowed) { await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'messages')); return; }
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        const result = await APIClient.analyzeImage(base64Image);
        const analysis = ResponseFormatter.cleanMarkdown(result.response || 'Image analyzed!');
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Image analysis failed!* Please try again.`); }
});

bot.on('voice', async (ctx) => {
    const rateLimit = storage.checkRateLimit(ctx.from.id, 'voice');
    if (!rateLimit.allowed) { await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'voice')); return; }
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const voiceResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const result = await APIClient.voiceChat(voiceResponse.data, 'hi');
        const reply = ResponseFormatter.cleanMarkdown(result.response || result.transcript || 'Voice processed!');
        await ctx.reply(reply);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *Voice processing failed!* Please try again.`); }
});

bot.on('document', async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const doc = ctx.message.document;
        const file = await ctx.telegram.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileResponse.data).toString('base64');
        const result = await APIClient.analyzeFile(doc.file_name, base64File);
        const analysis = ResponseFormatter.cleanMarkdown(result.response || 'File analyzed!');
        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${analysis.substring(0, 2000)}`);
    } catch (error) { await ctx.replyWithMarkdown(`❌ *File analysis failed!* Please try again.`); }
});

// ==========================================
// ========== TEXT MESSAGE HANDLER ==========
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    if (text === CONFIG.ADMIN_SECRET) return;

    const rateLimit = storage.checkRateLimit(ctx.from.id, 'messages');
    if (!rateLimit.allowed) { await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'messages')); return; }

    const isAdminMode = storage.isAdminSession(ctx.from.id);
    await StreamingEngine.streamResponse(text, ctx, isAdminMode);
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
        'new_chat': () => ctx.editMessageText(`💬 *New Chat Started!*\n\nJust type your message below!`, { parse_mode: 'Markdown' }),
        'image_info': () => ctx.editMessageText(`🎨 *Image Generation*\n\n• \`/generate sunset\` — Auto\n• \`/generate --realistic mountain\` — Realistic\n• \`/generate --artistic dream\` — Artistic`, { parse_mode: 'Markdown' }),
        'photo_info': () => ctx.editMessageText(`📸 *Real Photos*\n\n• \`/photo Taj Mahal\`\n• \`/photo beautiful beach\``, { parse_mode: 'Markdown' }),
        'shopping_info': () => ctx.editMessageText(`🛍️ *Shopping*\n\n• \`/shop iPhone 15\`\n• \`/shop laptop under 50000\``, { parse_mode: 'Markdown' }),
        'voice_info': () => ctx.editMessageText(`🎤 *Voice Chat*\n\nSend a voice message in Hindi or English — I'll transcribe and respond!`, { parse_mode: 'Markdown' }),
        'more_info': async () => { await ctx.editMessageText(`⚙️ *More Features*\n\nSelect an option:`, Keyboards.more); },
        'back_main': async () => { await ctx.editMessageText(`🤖 *${CONFIG.APP_NAME} AI — Main Menu*`, Keyboards.main); },
        'file_info': () => ctx.editMessageText(`📄 *File Analysis*\n\nSend any document (PDF, TXT, DOC) — I'll analyze it!`, { parse_mode: 'Markdown' }),
        'youtube_info': () => ctx.editMessageText(`🎬 *YouTube Summary*\n\n• \`/youtube [video_url]\`\n\nGet AI-powered video summaries!`, { parse_mode: 'Markdown' }),
        'qr_info': () => ctx.editMessageText(`🔲 *QR Code*\n\n• \`/qr [text or URL]\`\n\nGenerate QR codes instantly!`, { parse_mode: 'Markdown' }),
        'canvas_info': () => ctx.editMessageText(`🎨 *Canvas Artifact*\n\n• \`/canvas [HTML code]\`\n\nCreate and share web artifacts!`, { parse_mode: 'Markdown' }),
        'reminder_info': () => ctx.editMessageText(`⏰ *Reminder*\n\n• \`/remind [message] in [minutes]\`\n\nExample: \`/remind Call meeting in 30\``, { parse_mode: 'Markdown' }),
        'translate_info': () => ctx.editMessageText(`🌐 *Translate*\n\n• \`/translate [text] to [language]\`\n\nExample: \`/translate Hello to hi\``, { parse_mode: 'Markdown' }),
        'admin_panel': async () => {
            storage.createAdminSession(userId, {});
            await ctx.editMessageText(`👑 *Admin Panel*\n\nSelect an action:`, Keyboards.adminPanel);
        },
        'admin_plans': async () => {
            try {
                const plans = await APIClient.getPremiumPlans();
                await ctx.editMessageText(`📋 *Premium Plans*\n\n${JSON.stringify(plans, null, 2).substring(0, 1000)}`, { parse_mode: 'Markdown' });
            } catch { await ctx.editMessageText(`📋 *Premium Plans*\n\n• Plus: ₹299/month\n• Pro: ₹1,499/year\n• Enterprise: ₹2,999/year\n\nUPI: ${CONFIG.UPI_ID}`, { parse_mode: 'Markdown' }); }
        },
        'admin_status': async () => {
            const stats = storage.getStats();
            await ctx.editMessageText(`📊 *System Status*\n\n• Admin Sessions: ${stats.adminSessions}\n• Premium Users: ${stats.premiumUsers}\n• Active Streams: ${stats.activeStreams}\n• Tracked Users: ${stats.totalTracked}\n• Your ID: \`${userId}\``, { parse_mode: 'Markdown' });
        },
        'admin_health': () => ctx.editMessageText(`🏥 *Health Check*\n\n✅ Bot: Running\n✅ API: Online\n✅ Webhook: Active\n✅ Streaming: Enabled\n📅 ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' }),
        'admin_clear': () => ctx.editMessageText(`🗑️ *Clear Session*\n\nTo clear a user's session:\nCommand: \`/clear [user_id]\``, { parse_mode: 'Markdown' }),
        'admin_logout': () => {
            storage.destroyAdminSession(userId);
            ctx.editMessageText(`🚪 *Admin panel closed!*\n\nUse /admin to access again.`, { parse_mode: 'Markdown' });
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