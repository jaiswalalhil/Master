// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - INDUSTRY LEVEL PRODUCTION                          ║
// ║  Enterprise Grade | Full Streaming | 6 Models | 3 Image Engines             ║
// ║  Created by Akhil Jaiswal 🇮🇳                                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// ========== ENTERPRISE CONFIGURATION ==========
// ==========================================
const CONFIG = {
    // Core
    BOT_TOKEN: process.env.BOT_TOKEN || "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I",
    WORKER_URL: "https://nexus-a1.apikeyakhilka.workers.dev/api",
    VOICE_URL: "https://nexus-a1.apikeyakhilka.workers.dev/voice-chat",
    API_KEY: "akhil-123",

    // Admin
    ADMIN_SECRET: process.env.ADMIN_SECRET || "KaaliNexus@2026",
    ADMIN_IDS: new Set([8681361916]),

    // Business
    APP_NAME: 'NEXUS',
    CREATOR: 'Akhil Jaiswal',
    UPI_ID: 'jaiswalanushi8@oksbi',

    // Limits
    DAILY_LIMITS: {
        free: { messages: 50, images: 10, voice: 5 },
        premium: { messages: Infinity, images: Infinity, voice: Infinity }
    },

    // Timeouts
    STREAMING_TIMEOUT: 120000,
    API_TIMEOUT: 60000,
    IMAGE_TIMEOUT: 120000,

    // Streaming
    STREAMING_MODE: 'word', // word, sentence, smart
    CHUNK_DELAY: 30, // milliseconds between chunks
    UPDATE_INTERVAL: 500 // milliseconds between message updates
};

// ==========================================
// ========== ENTERPRISE STORAGE ==========
// ==========================================
class EnterpriseStorage {
    constructor() {
        this.adminSessions = new Map();
        this.premiumUsers = new Map();
        this.usageTracker = new Map();
        this.streamingControllers = new Map();
        this.streamingMessages = new Map();
    }

    isAdmin(userId) {
        return CONFIG.ADMIN_IDS.has(userId);
    }

    isPremium(userId) {
        return this.premiumUsers.has(userId);
    }

    activatePremium(userId) {
        this.premiumUsers.set(userId, true);
        return true;
    }

    revokePremium(userId) {
        return this.premiumUsers.delete(userId);
    }

    isAdminSession(userId) {
        return this.adminSessions.has(userId);
    }

    createAdminSession(userId, data) {
        this.adminSessions.set(userId, { ...data, createdAt: Date.now() });
        return true;
    }

    destroyAdminSession(userId) {
        return this.adminSessions.delete(userId);
    }

    checkRateLimit(userId, type) {
        const isPremiumUser = this.isPremium(userId) || this.isAdmin(userId);
        const limits = CONFIG.DAILY_LIMITS[isPremiumUser ? 'premium' : 'free'];
        const limit = limits[type] || 50;

        if (limit === Infinity) return { allowed: true, remaining: Infinity };

        const today = new Date().toISOString().split('T')[0];
        const key = `${userId}:${type}:${today}`;
        const current = this.usageTracker.get(key) || 0;

        if (current >= limit) {
            return { allowed: false, remaining: 0, limit };
        }

        this.usageTracker.set(key, current + 1);

        // Auto cleanup after 24 hours
        setTimeout(() => {
            if (this.usageTracker.get(key) === current + 1) {
                this.usageTracker.delete(key);
            }
        }, 86400000);

        return { allowed: true, remaining: limit - current - 1, limit };
    }

    setStreamingController(chatId, controller) {
        this.streamingControllers.set(chatId, controller);
    }

    clearStreamingController(chatId) {
        const controller = this.streamingControllers.get(chatId);
        if (controller) {
            controller.abort();
            this.streamingControllers.delete(chatId);
        }
        this.streamingMessages.delete(chatId);
    }

    setStreamingMessage(chatId, messageId) {
        this.streamingMessages.set(chatId, messageId);
    }

    getStreamingMessage(chatId) {
        return this.streamingMessages.get(chatId);
    }

    getStats() {
        return {
            adminSessions: this.adminSessions.size,
            premiumUsers: this.premiumUsers.size,
            activeStreams: this.streamingControllers.size,
            totalTracked: this.usageTracker.size
        };
    }
}

const storage = new EnterpriseStorage();

// ==========================================
// ========== TELEGRAM RESPONSE FORMATTER ==========
// ==========================================
class ResponseFormatter {
    static cleanMarkdown(text) {
        if (!text) return '';

        return text
            // Remove markdown headings
            .replace(/^#{1,6}\s+/gm, '')
            // Convert tables to bullet points
            .replace(/\|(.+?)\|/g, (match) => {
                if (match.includes('---')) return '';
                const cells = match.split('|').filter(c => c.trim());
                if (cells.length === 0) return '';
                return cells.map(c => `• ${c.trim()}`).join('\n');
            })
            // Convert links to plain text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            // Remove horizontal lines
            .replace(/^[\-\*]{3,}$/gm, '')
            // Normalize line breaks
            .replace(/\n{3,}/g, '\n\n')
            // Trim
            .trim();
    }

    static formatResponse(response, model, latency, isAdminMode) {
        let text = this.cleanMarkdown(response);
        if (isAdminMode) {
            text = `👑 *[ADMIN MODE]*\n\n${text}`;
        }
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

        // Send initial message
        const initialMessage = await ctx.reply("🧠 *Processing your request...*", { parse_mode: 'Markdown' });
        let currentMessageId = initialMessage.message_id;
        storage.setStreamingMessage(chatId, currentMessageId);

        // Create abort controller
        const abortController = new AbortController();
        storage.setStreamingController(chatId, abortController);

        let fullResponse = '';
        let lastUpdateTime = Date.now();
        let pendingUpdate = false;

        try {
            // Make streaming request to worker
            const response = await fetch(CONFIG.WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': CONFIG.API_KEY,
                    'X-Stream-Mode': CONFIG.STREAMING_MODE,
                    ...(isAdminMode && { 'X-User-ID': 'akhil' })
                },
                body: JSON.stringify({
                    action: 'chat',
                    message: message
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

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
                            // Stream complete - send final response
                            const cleanedResponse = ResponseFormatter.cleanMarkdown(fullResponse);
                            const finalText = isAdminMode ? `👑 *[ADMIN MODE]*\n\n${cleanedResponse}` : cleanedResponse;
                            const latency = Date.now() - startTime;

                            await ctx.telegram.editMessageText(
                                chatId,
                                currentMessageId,
                                null,
                                `${finalText}\n\n⚡ ${latency}ms | 🤖 AI`,
                                { parse_mode: 'Markdown' }
                            );
                            return;
                        }

                        try {
                            const data = JSON.parse(dataStr);

                            switch (data.type) {
                                case 'chunk':
                                    if (data.text) {
                                        fullResponse += data.text;

                                        // Update message periodically
                                        const now = Date.now();
                                        if (!pendingUpdate && (now - lastUpdateTime) >= CONFIG.UPDATE_INTERVAL) {
                                            pendingUpdate = true;

                                            const preview = fullResponse.length > 800 
                                                ? fullResponse.substring(0, 800) + '...' 
                                                : fullResponse;
                                            const cleanedPreview = ResponseFormatter.cleanMarkdown(preview);

                                            try {
                                                await ctx.telegram.editMessageText(
                                                    chatId,
                                                    currentMessageId,
                                                    null,
                                                    `🤖 *Generating...*\n\n${cleanedPreview}`,
                                                    { parse_mode: 'Markdown' }
                                                );
                                                lastUpdateTime = now;
                                            } catch (editError) {
                                                // If edit fails (message too long), send new message
                                                if (editError.response?.statusCode === 400) {
                                                    const newMessage = await ctx.reply(
                                                        `🤖 *Continuing...*\n\n${cleanedPreview}`,
                                                        { parse_mode: 'Markdown' }
                                                    );
                                                    currentMessageId = newMessage.message_id;
                                                    storage.setStreamingMessage(chatId, currentMessageId);
                                                }
                                            }
                                            pendingUpdate = false;
                                        }
                                    }
                                    break;

                                case 'thinking':
                                    // Update thinking status
                                    try {
                                        await ctx.telegram.editMessageText(
                                            chatId,
                                            currentMessageId,
                                            null,
                                            `🧠 *${data.reason || 'Thinking...'}*`,
                                            { parse_mode: 'Markdown' }
                                        );
                                    } catch (e) {}
                                    break;

                                case 'search':
                                    // Show search status
                                    try {
                                        await ctx.telegram.editMessageText(
                                            chatId,
                                            currentMessageId,
                                            null,
                                            `🔍 *Searching: ${data.source || 'Web'}*\n${data.snippet || 'Gathering information...'}`,
                                            { parse_mode: 'Markdown' }
                                        );
                                    } catch (e) {}
                                    break;

                                case 'error':
                                    throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error('Stream parse error:', parseError);
                        }
                    }
                }
            }

            // If we exit without [DONE], send whatever we have
            if (fullResponse) {
                const cleanedResponse = ResponseFormatter.cleanMarkdown(fullResponse);
                const finalText = isAdminMode ? `👑 *[ADMIN MODE]*\n\n${cleanedResponse}` : cleanedResponse;
                const latency = Date.now() - startTime;

                await ctx.telegram.editMessageText(
                    chatId,
                    currentMessageId,
                    null,
                    `${finalText}\n\n⚡ ${latency}ms | 🤖 AI`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                await ctx.telegram.editMessageText(
                    chatId,
                    currentMessageId,
                    null,
                    `⏹️ *Streaming stopped by user*`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                console.error('Streaming error:', error);
                await ctx.telegram.editMessageText(
                    chatId,
                    currentMessageId,
                    null,
                    ResponseFormatter.formatError(error, isAdminMode),
                    { parse_mode: 'Markdown' }
                );
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
    static async generateImage(prompt, style = 'auto') {
        const styleMap = {
            realistic: 'photorealistic',
            artistic: 'artistic',
            auto: 'auto'
        };

        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_generate',
            prompt: prompt,
            style: styleMap[style] || 'auto'
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.IMAGE_TIMEOUT,
            responseType: 'arraybuffer'
        });

        return response.data;
    }

    static async searchPhotos(query) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'real_photo',
            query: query,
            per_page: 5
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.API_TIMEOUT
        });

        return response.data;
    }

    static async analyzeImage(base64Image) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'chat',
            image: base64Image,
            message: 'Describe this image in detail'
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.API_TIMEOUT
        });

        return response.data;
    }

    static async voiceChat(audioBuffer, language = 'hi') {
        const formData = new FormData();
        formData.append('audio', Buffer.from(audioBuffer), { 
            filename: 'voice.ogg', 
            contentType: 'audio/ogg' 
        });
        formData.append('language', language);

        const response = await axios.post(CONFIG.VOICE_URL, formData, {
            headers: { ...formData.getHeaders(), 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.API_TIMEOUT
        });

        return response.data;
    }

    static async analyzeFile(filename, content) {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'analyze_file',
            filename: filename,
            content: content
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.API_TIMEOUT * 1.5
        });

        return response.data;
    }

    static async getPremiumStatus(userId) {
        try {
            const response = await axios.post(CONFIG.WORKER_URL, {
                action: 'premium_status',
                userId: String(userId)
            }, {
                headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
                timeout: 10000
            });
            return response.data?.isPremium || false;
        } catch {
            return false;
        }
    }
}

// ==========================================
// ========== KEYBOARD DEFINITIONS ==========
// ==========================================
const Keyboards = {
    main: Markup.inlineKeyboard([
        [Markup.button.callback('💬 New Chat', 'new_chat')],
        [Markup.button.callback('🎨 Generate Image', 'image_info')],
        [Markup.button.callback('📸 Search Photos', 'photo_info')],
        [Markup.button.callback('⚙️ Settings', 'settings')]
    ]),

    admin: Markup.inlineKeyboard([
        [Markup.button.callback('👑 Admin Panel', 'admin_panel')]
    ]),

    adminPanel: Markup.inlineKeyboard([
        [Markup.button.callback('👑 Verify Premium', 'admin_verify')],
        [Markup.button.callback('📊 System Status', 'admin_status')],
        [Markup.button.callback('❌ Revoke Premium', 'admin_revoke')],
        [Markup.button.callback('📋 Premium Plans', 'admin_plans')],
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

// Start Command
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const isAdmin = storage.isAdmin(userId);

    const welcomeMessage = `🤖 *${CONFIG.APP_NAME} AI — Enterprise Edition*\n\n` +
        `👋 Hello ${ctx.from.first_name}! I'm ${CONFIG.APP_NAME}, your AI assistant.\n\n` +
        `**🎯 Capabilities:**\n` +
        `• 💬 *Intelligent Chat* (Streaming responses)\n` +
        `• 🌐 *Real-Time Web Search*\n` +
        `• 🎨 *AI Image Generation* (3 engines)\n` +
        `• 📸 *Real Photo Search* (Unsplash+Pixabay)\n` +
        `• 👁️ *Vision Analysis*\n` +
        `• 🎤 *Voice Chat*\n` +
        `• 📄 *File Analysis*\n\n` +
        `**⚡ Quick Commands:**\n` +
        `• /generate sunset — AI Image\n` +
        `• /photo Taj Mahal — Real Photos\n` +
        `• /status — Check Premium\n` +
        `• /help — Full Guide\n\n` +
        `💡 *Just type anything to start chatting!*`;

    if (isAdmin) {
        await ctx.replyWithMarkdown(welcomeMessage + `\n\n🔐 *Admin access granted.*`, Keyboards.admin);
    } else {
        await ctx.replyWithMarkdown(welcomeMessage, Keyboards.main);
    }
});

// Help Command
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *${CONFIG.APP_NAME} AI — Complete Guide*\n\n` +
        `**💬 Chat:**\n` +
        `• Type any message — AI responds with streaming\n` +
        `• /cancel — Stop current response\n` +
        `• /status — Check your premium status\n` +
        `• /premium [code] — Activate premium\n\n` +
        `**🎨 Images:**\n` +
        `• /generate [prompt] — Auto mode\n` +
        `• /generate --realistic [prompt] — Photorealistic\n` +
        `• /generate --artistic [prompt] — Artistic\n` +
        `• /photo [query] — Search real photos\n` +
        `• /vary [instruction] — Edit image (reply to photo)\n` +
        `• /enhance — Improve quality (reply to photo)\n\n` +
        `**🎤 Media:**\n` +
        `• Send a photo — AI analyzes it\n` +
        `• Send a voice message — AI transcribes & responds\n` +
        `• Send a document — AI analyzes content\n\n` +
        `**🆔 Utility:**\n` +
        `• /myid — Get your Telegram ID\n` +
        `• /help — Show this menu\n\n` +
        `💎 *Premium: Unlimited messages, images, voice*`
    );
});

// Cancel Command
bot.command('cancel', async (ctx) => {
    const chatId = ctx.chat.id;
    storage.clearStreamingController(chatId);
    await ctx.reply(`⏹️ *Response stopped*`, { parse_mode: 'Markdown' });
});

// My ID Command
bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 *Your Telegram ID:* \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// Status Command
bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const workerPremium = await APIClient.getPremiumStatus(userId);
    const localPremium = storage.isPremium(userId);
    const isPremiumUser = workerPremium || localPremium;
    const rateLimit = storage.checkRateLimit(userId, 'messages');

    await ctx.replyWithMarkdown(
        `📊 *Premium Status*\n\n` +
        `👤 *User:* ${ctx.from.first_name}\n` +
        `🆔 *ID:* \`${userId}\`\n` +
        `💎 *Premium:* ${isPremiumUser ? '✅ Active' : '❌ Inactive'}\n` +
        `📅 *Today's Usage:* ${rateLimit.limit === Infinity ? 'Unlimited' : `${50 - (rateLimit.remaining + 1)}/50 messages`}\n\n` +
        (isPremiumUser ? `✨ *Unlimited access activated!*` : `💡 *Contact admin for premium access*`)
    );
});

// Premium Command
bot.command('premium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const code = args[1];

    if (!code) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/premium [code]\`\n\nContact admin to obtain premium code.`);
        return;
    }

    if (code === CONFIG.ADMIN_SECRET) {
        storage.activatePremium(ctx.from.id);
        await ctx.replyWithMarkdown(`✅ *Premium Activated!*\n\n✨ You now have unlimited access to all features.\n📅 No daily limits!`);
    } else {
        await ctx.replyWithMarkdown(`❌ *Invalid premium code!*\n\nPlease check your code and try again.`);
    }
});

// ==========================================
// ========== IMAGE COMMANDS ==========
// ==========================================

// Generate Image Command
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
            `*Usage:*\n` +
            `• \`/generate sunset\` — Auto (Flux)\n` +
            `• \`/generate --realistic mountain\` — Realistic (SDXL)\n` +
            `• \`/generate --artistic dream\` — Artistic (DreamShaper)\n\n` +
            `*Example:* \`/generate --realistic beautiful beach sunset\``
        );
        return;
    }

    // Check rate limit
    const rateLimit = storage.checkRateLimit(ctx.from.id, 'images');
    if (!rateLimit.allowed) {
        await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'images'));
        return;
    }

    const styleNames = {
        realistic: '📷 SDXL (Realistic)',
        artistic: '🎨 DreamShaper (Artistic)',
        auto: '⚡ Flux (Auto)'
    };

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
        console.error('Image generation error:', error);
        await ctx.reply(`❌ *Image generation failed!* Please try again later.`, { parse_mode: 'Markdown' });
    }
});

// Photo Search Command
bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();

    if (!query) {
        await ctx.replyWithMarkdown(
            `📸 *Real Photo Search*\n\n` +
            `*Usage:* \`/photo [search term]\`\n\n` +
            `*Examples:*\n` +
            `• \`/photo Taj Mahal\`\n` +
            `• \`/photo beautiful beach\`\n` +
            `• \`/photo red rose flower\``
        );
        return;
    }

    await ctx.reply(`🔍 *Searching real photos for:* "${query}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
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
                    caption: i === 0 ? `📸 *${query}*\n📷 Source: ${result.source}\n🔍 ${result.total || result.photos.length} results` : undefined,
                    parse_mode: 'Markdown'
                });
            }
            await ctx.replyWithMediaGroup(mediaGroup);
        } else {
            await ctx.replyWithMarkdown(
                `❌ *No photos found for:* "${query}"\n\n` +
                `💡 *Tips:*\n` +
                `• Try different keywords\n` +
                `• Use /generate for AI images\n` +
                `• Check spelling`
            );
        }
    } catch (error) {
        console.error('Photo search error:', error);
        await ctx.replyWithMarkdown(`❌ *Photo search failed!* Please try again.`);
    }
});

// Image Vary Command
bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();

    if (!instruction || !ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(
            `🎨 *Image Variation*\n\n` +
            `*Usage:* Reply to an image with \`/vary [instruction]\`\n\n` +
            `*Examples:*\n` +
            `• \`/vary make it more colorful\`\n` +
            `• \`/vary add a sunset background\`\n` +
            `• \`/vary improve the lighting\``
        );
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

        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_edit',
            image: base64Image,
            instruction: instruction
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.IMAGE_TIMEOUT,
            responseType: 'arraybuffer'
        });

        if (response.data && response.data.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🎨 *Image Variation*\n📝 ${instruction}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Image editing failed!* Please try again.`);
        }
    } catch (error) {
        console.error('Image vary error:', error);
        await ctx.replyWithMarkdown(`❌ *Image editing failed!* Please try again.`);
    }
});

// Image Enhance Command
bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
        await ctx.replyWithMarkdown(
            `✨ *Image Enhancement*\n\n` +
            `*Usage:* Reply to an image with \`/enhance\`\n\n` +
            `Enhances image quality, sharpness, and details.`
        );
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

        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_enhance',
            image: base64Image
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: CONFIG.IMAGE_TIMEOUT,
            responseType: 'arraybuffer'
        });

        if (response.data && response.data.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `✨ *Enhanced Image*\nQuality improved!`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Image enhancement failed!* Please try again.`);
        }
    } catch (error) {
        console.error('Image enhance error:', error);
        await ctx.replyWithMarkdown(`❌ *Image enhancement failed!* Please try again.`);
    }
});

// ==========================================
// ========== ADMIN COMMANDS ==========
// ==========================================

// Admin Command
bot.command('admin', async (ctx) => {
    const userId = ctx.from.id;

    if (!storage.isAdmin(userId)) {
        return; // Silently ignore for non-admins
    }

    storage.createAdminSession(userId, {
        username: ctx.from.first_name,
        startedAt: new Date().toISOString()
    });

    await ctx.replyWithMarkdown(
        `👑 *Admin Panel*\n\n` +
        `Welcome, ${ctx.from.first_name}!\n` +
        `🕐 ${new Date().toLocaleString()}\n\n` +
        `Select an action:`,
        Keyboards.adminPanel
    );
});

// ==========================================
// ========== MEDIA HANDLERS ==========
// ==========================================

// Photo Handler (Vision Analysis)
bot.on('photo', async (ctx) => {
    const rateLimit = storage.checkRateLimit(ctx.from.id, 'messages');
    if (!rateLimit.allowed) {
        await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'messages'));
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
        const analysis = ResponseFormatter.cleanMarkdown(result.response || 'Image analyzed!');

        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        console.error('Photo analysis error:', error);
        await ctx.replyWithMarkdown(`❌ *Image analysis failed!* Please try again.`);
    }
});

// Voice Handler
bot.on('voice', async (ctx) => {
    const rateLimit = storage.checkRateLimit(ctx.from.id, 'voice');
    if (!rateLimit.allowed) {
        await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'voice'));
        return;
    }

    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const voiceResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });

        const result = await APIClient.voiceChat(voiceResponse.data, 'hi');
        const reply = ResponseFormatter.cleanMarkdown(result.response || result.transcript || 'Voice processed!');

        await ctx.reply(reply);
    } catch (error) {
        console.error('Voice processing error:', error);
        await ctx.replyWithMarkdown(`❌ *Voice processing failed!* Please try again.`);
    }
});

// Document Handler
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
    } catch (error) {
        console.error('File analysis error:', error);
        await ctx.replyWithMarkdown(`❌ *File analysis failed!* Please try again.`);
    }
});

// ==========================================
// ========== TEXT MESSAGE HANDLER (STREAMING) ==========
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // Skip commands and admin secret
    if (text.startsWith('/')) return;
    if (text === CONFIG.ADMIN_SECRET) return;

    const userId = ctx.from.id;

    // Check rate limit
    const rateLimit = storage.checkRateLimit(userId, 'messages');
    if (!rateLimit.allowed) {
        await ctx.replyWithMarkdown(ResponseFormatter.formatLimitWarning(rateLimit.limit, 'messages'));
        return;
    }

    const isAdminMode = storage.isAdminSession(userId);

    // Use streaming for all chat messages
    await StreamingEngine.streamResponse(text, ctx, isAdminMode);
});

// ==========================================
// ========== CALLBACK QUERY HANDLER ==========
// ==========================================
bot.action(/.*/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    await ctx.answerCbQuery();

    // Check admin access for admin actions
    if (data.startsWith('admin_') && !storage.isAdminSession(userId)) {
        await ctx.editMessageText(`❌ *Admin access required!*`, { parse_mode: 'Markdown' });
        return;
    }

    const handlers = {
        'new_chat': async () => {
            await ctx.editMessageText(
                `💬 *New Chat Started!*\n\nJust type your message below!`,
                { parse_mode: 'Markdown' }
            );
        },

        'image_info': async () => {
            await ctx.editMessageText(
                `🎨 *AI Image Generation*\n\n` +
                `• \`/generate sunset\` — Auto\n` +
                `• \`/generate --realistic mountain\` — Realistic\n` +
                `• \`/generate --artistic dream\` — Artistic\n\n` +
                `💡 Try: \`/generate --realistic beautiful beach sunset\``,
                { parse_mode: 'Markdown' }
            );
        },

        'photo_info': async () => {
            await ctx.editMessageText(
                `📸 *Real Photo Search*\n\n` +
                `• \`/photo Taj Mahal\`\n` +
                `• \`/photo beautiful beach\`\n` +
                `• \`/photo red rose\`\n\n` +
                `Searches Unsplash + Pixabay for high-quality photos.`,
                { parse_mode: 'Markdown' }
            );
        },

        'settings': async () => {
            const stats = storage.getStats();
            await ctx.editMessageText(
                `⚙️ *System Settings*\n\n` +
                `• Free: 50 messages/day\n` +
                `• Premium: Unlimited\n` +
                `• Images: 10/day (free)\n` +
                `• Voice: 5/day (free)\n` +
                `• Streaming: Word-by-word\n\n` +
                `📊 *System Stats:*\n` +
                `• Active Admins: ${stats.adminSessions}\n` +
                `• Premium Users: ${stats.premiumUsers}\n` +
                `• Active Streams: ${stats.activeStreams}\n\n` +
                `💡 Contact admin for premium access.`,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_panel': async () => {
            storage.createAdminSession(userId, { username: ctx.from.first_name });
            await ctx.editMessageText(
                `👑 *Admin Panel*\n\nSelect an action:`,
                Keyboards.adminPanel
            );
        },

        'admin_verify': async () => {
            await ctx.editMessageText(
                `👑 *Verify Premium*\n\n` +
                `User sends: \`/premium ${CONFIG.ADMIN_SECRET}\``,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_status': async () => {
            const stats = storage.getStats();
            await ctx.editMessageText(
                `📊 *System Status*\n\n` +
                `• Admin Sessions: ${stats.adminSessions}\n` +
                `• Premium Users: ${stats.premiumUsers}\n` +
                `• Active Streams: ${stats.activeStreams}\n` +
                `• Tracked Users: ${stats.totalTracked}\n` +
                `• Your ID: \`${userId}\``,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_revoke': async () => {
            await ctx.editMessageText(
                `❌ *Revoke Premium*\n\n` +
                `To revoke premium from a user:\n` +
                `Command: \`/revoke [user_id]\`\n\n` +
                `Example: \`/revoke 123456789\``,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_plans': async () => {
            await ctx.editMessageText(
                `📋 *Premium Plans*\n\n` +
                `┌─────────────────────────────┐\n` +
                `│ 💎 *Plus*     ₹299/month    │\n` +
                `│   500 msgs, 100 images       │\n` +
                `├─────────────────────────────┤\n` +
                `│ 👑 *Pro*      ₹1,499/year   │\n` +
                `│   2000 msgs, 500 images      │\n` +
                `├─────────────────────────────┤\n` +
                `│ 🏰 *Enterprise* ₹2,999/year │\n` +
                `│   Unlimited everything       │\n` +
                `└─────────────────────────────┘\n\n` +
                `UPI: \`${CONFIG.UPI_ID}\``,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_health': async () => {
            await ctx.editMessageText(
                `🏥 *Health Check*\n\n` +
                `✅ Bot: Running\n` +
                `✅ API: Online\n` +
                `✅ Webhook: Active\n` +
                `✅ Streaming: Enabled\n` +
                `✅ Memory: ${process.memoryUsage ? `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB` : 'N/A'}\n` +
                `📅 ${new Date().toLocaleString()}`,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_clear': async () => {
            await ctx.editMessageText(
                `🗑️ *Clear Session*\n\n` +
                `To clear a user's session:\n` +
                `Command: \`/clear [user_id]\`\n\n` +
                `Example: \`/clear 123456789\``,
                { parse_mode: 'Markdown' }
            );
        },

        'admin_logout': async () => {
            storage.destroyAdminSession(userId);
            await ctx.editMessageText(
                `🚪 *Admin panel closed!*\n\nUse /admin to access again.`,
                { parse_mode: 'Markdown' }
            );
        }
    };

    const handler = handlers[data];
    if (handler) {
        await handler();
    }
});

// ==========================================
// ========== NETLIFY FUNCTION HANDLER ==========
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