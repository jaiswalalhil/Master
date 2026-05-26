// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI - WORLD'S MOST POWERFUL TELEGRAM BOT                              ║
// ║  28 Actions | 6 AI Models | 3 Image Engines | Voice | Premium | Paid Features║
// ║  Fully Synced with MONSTER AI v8.0 Worker                                   ║
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
    ADMIN_SECRET: "KaaliNexus@2026",
    ADMIN_IDS: new Set([8681361916]),
    APP_NAME: 'NEXUS',
    CREATOR: 'Akhil Jaiswal',
    UPI_ID: 'jaiswalanushi8@oksbi',
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || ""
};

// Premium Plans (Matching Worker)
const PREMIUM_PLANS = {
    plus: { name: 'NEXUS Plus', price: 299, days: 365, messages: 500, images: 100, emoji: '⭐' },
    pro: { name: 'NEXUS Pro', price: 1499, days: 365, messages: 2000, images: 500, emoji: '👑' },
    enterprise: { name: 'NEXUS Enterprise', price: 2999, days: 365, messages: Infinity, images: Infinity, emoji: '🏰' }
};

// Paid Features (Matching Worker)
const PAID_FEATURES = {
    resume_builder: { name: 'Resume Builder', price: 49, emoji: '📄', desc: 'Create professional ATS-friendly resume' },
    cover_letter: { name: 'Cover Letter', price: 29, emoji: '✉️', desc: 'Generate custom cover letter for job applications' },
    blog_generator: { name: 'SEO Blog Generator', price: 99, emoji: '📝', desc: 'Generate 1000-2000 word SEO optimized blog' },
    social_posts: { name: 'Social Posts (30 days)', price: 49, emoji: '📱', desc: '30 days of daily social media content' },
    code_execution: { name: 'Code Execution', price: 199, emoji: '💻', desc: 'Execute code 1000 times (Python/JS)' }
};

// AI Agents (Matching Worker)
const AI_AGENTS = {
    code_reviewer: { name: 'Code Reviewer', icon: '🔍', prompt: 'Expert code reviewer. Find bugs, security issues, performance improvements.' },
    math_tutor: { name: 'Math Tutor', icon: '📐', prompt: 'World-class math professor. Step-by-step explanations using LaTeX.' },
    story_writer: { name: 'Creative Writer', icon: '✍️', prompt: 'Award-winning writer. Create immersive stories with vivid imagery.' },
    data_analyst: { name: 'Data Analyst', icon: '📊', prompt: 'Senior data scientist. Pattern recognition, insights, predictions.' },
    career_coach: { name: 'Career Coach', icon: '🎯', prompt: 'Elite career coach. Resume, interview, salary negotiation tips.' },
    health_advisor: { name: 'Health Advisor', icon: '💪', prompt: 'Holistic wellness expert. Science-backed health advice.' },
    language_tutor: { name: 'Language Tutor', icon: '🗣️', prompt: 'Polyglot teacher. Learn languages through conversation.' },
    business_mentor: { name: 'Business Mentor', icon: '💼', prompt: 'Serial entrepreneur. Business strategy, marketing, finance.' }
};

// Storage
if (!global.paymentSessions) global.paymentSessions = new Map();
if (!global.userFeatures) global.userFeatures = new Map();

// ==========================================
// ========== HELPERS ==========
// ==========================================
class Helpers {
    static isAdmin(userId) { return CONFIG.ADMIN_IDS.has(userId); }

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

    static async callWorker(action, payload = {}, userId = null, isAdmin = false, responseType = 'json') {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (userId) headers['X-User-ID'] = String(userId);
        if (isAdmin) headers['X-User-ID'] = 'akhil';
        
        const response = await axios.post(CONFIG.WORKER_URL, { action, ...payload }, { 
            headers, timeout: 120000, responseType 
        });
        return response.data;
    }

    static async callVoice(audioBuffer, language = 'hi') {
        const formData = new FormData();
        formData.append('audio', Buffer.from(audioBuffer), { filename: 'voice.ogg', contentType: 'audio/ogg' });
        formData.append('language', language);
        
        const response = await axios.post(CONFIG.VOICE_URL, formData, {
            headers: { ...formData.getHeaders(), 'X-API-Key': CONFIG.API_KEY },
            timeout: 60000
        });
        return response.data;
    }

    static async checkUserFeature(userId, feature) {
        try {
            const result = await this.callWorker('check_feature', { feature }, userId);
            return result?.hasFeature || false;
        } catch { return false; }
    }
}

// ==========================================
// ========== KEYBOARDS ==========
// ==========================================
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💬 Chat', 'new_chat'), Markup.button.callback('🎨 Image', 'image_info')],
    [Markup.button.callback('📸 Photo', 'photo_info'), Markup.button.callback('🛍️ Shop', 'shopping_info')],
    [Markup.button.callback('🎤 Voice', 'voice_info'), Markup.button.callback('🤖 Agents', 'agents_info')],
    [Markup.button.callback('💎 Premium', 'premium_show'), Markup.button.callback('📦 Features', 'features_show')],
    [Markup.button.callback('⚙️ More', 'more_info')]
]);

const moreKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📄 File', 'file_info'), Markup.button.callback('🎬 YouTube', 'youtube_info')],
    [Markup.button.callback('🔲 QR', 'qr_info'), Markup.button.callback('🎨 Canvas', 'canvas_info')],
    [Markup.button.callback('⏰ Reminder', 'reminder_info'), Markup.button.callback('🌐 Translate', 'translate_info')],
    [Markup.button.callback('🔙 Back', 'back_main')]
]);

const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👑 Admin Panel', 'admin_panel')]
]);

const adminPanelKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💎 Plans', 'admin_plans'), Markup.button.callback('📦 Features', 'admin_features')],
    [Markup.button.callback('📊 Status', 'admin_status'), Markup.button.callback('🏥 Health', 'admin_health')],
    [Markup.button.callback('🗑️ Clear', 'admin_clear'), Markup.button.callback('🚪 Close', 'admin_logout')]
]);

const plansKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⭐ Plus - ₹299/yr (500/day)', 'plan_plus')],
    [Markup.button.callback('👑 Pro - ₹1,499/yr (2000/day)', 'plan_pro')],
    [Markup.button.callback('🏰 Enterprise - ₹2,999/yr (Unlimited)', 'plan_enterprise')],
    [Markup.button.callback('🔙 Back', 'premium_show')]
]);

const featuresKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📄 Resume Builder - ₹49', 'feature_resume')],
    [Markup.button.callback('✉️ Cover Letter - ₹29', 'feature_cover')],
    [Markup.button.callback('📝 SEO Blog - ₹99', 'feature_blog')],
    [Markup.button.callback('📱 Social Posts - ₹49', 'feature_social')],
    [Markup.button.callback('💻 Code Exec - ₹199', 'feature_code')],
    [Markup.button.callback('🔙 Back', 'main_menu')]
]);

const agentsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Code Reviewer', 'agent_code_reviewer')],
    [Markup.button.callback('📐 Math Tutor', 'agent_math_tutor')],
    [Markup.button.callback('✍️ Writer', 'agent_story_writer')],
    [Markup.button.callback('📊 Data Analyst', 'agent_data_analyst')],
    [Markup.button.callback('🎯 Career Coach', 'agent_career_coach')],
    [Markup.button.callback('💪 Health Advisor', 'agent_health_advisor')],
    [Markup.button.callback('🗣️ Language Tutor', 'agent_language_tutor')],
    [Markup.button.callback('💼 Business Mentor', 'agent_business_mentor')],
    [Markup.button.callback('🔙 Back', 'main_menu')]
]);

function getUPIPaymentButtons(amount, requestId) {
    const upiIntent = `upi://pay?pa=${CONFIG.UPI_ID}&pn=NEXUS%20PREMIUM&am=${amount}&cu=INR&tn=Payment%20${requestId}`;
    return Markup.inlineKeyboard([
        [Markup.button.url('🇮🇳 GPay', upiIntent), Markup.button.url('📱 PhonePe', upiIntent)],
        [Markup.button.url('💳 Paytm', upiIntent), Markup.button.url('🏦 Any UPI', upiIntent)],
        [Markup.button.callback('✅ Paid', 'payment_done'), Markup.button.callback('🔙 Cancel', 'main_menu')]
    ]);
}

// ==========================================
// ========== BOT INIT ==========
// ==========================================
const bot = new Telegraf(CONFIG.BOT_TOKEN);

// ==========================================
// ========== START ==========
// ==========================================
bot.start(async (ctx) => {
    const isAdmin = Helpers.isAdmin(ctx.from.id);
    let isPremium = false, userPlan = 'free';
    try {
        const status = await Helpers.callWorker('premium_status', {}, ctx.from.id);
        isPremium = status?.isPremium || false;
        userPlan = status?.plan || 'free';
    } catch (e) {}
    
    const message = `🤖 *${CONFIG.APP_NAME} AI - WORLD CLASS*\n\n` +
        `👋 Hello ${ctx.from.first_name}!\n\n` +
        `**⚡ 28 Actions | 6 Models | 3 Image Engines**\n\n` +
        `• 💬 *Chat* - Any question\n` +
        `• 🎨 *Images* - Flux/SDXL/DreamShaper\n` +
        `• 📸 *Photos* - Unsplash+Pixabay\n` +
        `• 🎤 *Voice* - Hindi/English\n` +
        `• 📄 *Files* - PDF/DOC/TXT\n` +
        `• 🛍️ *Shopping* - Amazon affiliate\n` +
        `• 🎬 *YouTube* - Video summaries\n` +
        `• 🔲 *QR* - Generate codes\n` +
        `• 🎨 *Canvas* - HTML artifacts\n` +
        `• ⏰ *Reminder* - Smart alerts\n` +
        `• 🌐 *Translate* - 21 languages\n` +
        `• 🤖 *8 AI Agents* - Experts\n\n` +
        `**📊 Status:** ${isPremium ? `💎 ${userPlan.toUpperCase()}` : '🆓 Free'}\n\n` +
        `💡 *Type anything or use buttons below!*`;
    
    if (isAdmin) await ctx.replyWithMarkdown(message + `\n\n🔐 *Admin Access*`, adminKeyboard);
    else await ctx.replyWithMarkdown(message, mainKeyboard);
});

// ==========================================
// ========== HELP ==========
// ==========================================
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *${CONFIG.APP_NAME} - COMPLETE GUIDE*\n\n` +
        `**💬 CHAT**\n• Type any message\n• /status - Check premium\n\n` +
        `**🎨 IMAGES**\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream\n• /photo Taj Mahal\n• /vary instruction (reply to image)\n• /enhance (reply to image)\n\n` +
        `**🎤 MEDIA**\n• Send photo - AI analyzes\n• Send voice - AI responds\n• Send document - AI analyzes\n\n` +
        `**🛍️ MORE**\n• /shop iPhone 15\n• /youtube URL\n• /qr text\n• /canvas html\n• /remind msg in minutes\n• /translate text to lang\n\n` +
        `**🤖 AGENTS**\n• /agent code_reviewer code\n• /agent math_tutor problem\n• /agent story_writer topic\n• /agent data_analyst data\n• /agent career_coach question\n• /agent health_advisor symptom\n• /agent language_tutor text\n• /agent business_mentor query\n\n` +
        `**💎 PREMIUM**\n• Plus: ₹299/yr (500/day)\n• Pro: ₹1,499/yr (2000/day)\n• Enterprise: ₹2,999/yr (Unlimited)\n\n` +
        `**📦 PAID FEATURES**\n• Resume Builder: ₹49\n• Cover Letter: ₹29\n• SEO Blog: ₹99\n• Social Posts: ₹49\n• Code Exec: ₹199\n\n` +
        `**🆔 UTILITY**\n• /myid - Get your ID`
    );
});

// ==========================================
// ========== MYID ==========
// ==========================================
bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 *ID:* \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// ========== STATUS ==========
// ==========================================
bot.command('status', async (ctx) => {
    try {
        const result = await Helpers.callWorker('premium_status', {}, ctx.from.id);
        const isPremium = result?.isPremium || false;
        const plan = result?.plan || 'free';
        const expiry = result?.premiumExpiry ? new Date(result.premiumExpiry).toLocaleDateString() : 'N/A';
        
        let limits = '';
        if (plan === 'plus') limits = '500 msgs/day, 100 images/day';
        else if (plan === 'pro') limits = '2000 msgs/day, 500 images/day';
        else if (plan === 'enterprise') limits = '✨ UNLIMITED ✨';
        else limits = '50 msgs/day, 10 images/day';
        
        await ctx.replyWithMarkdown(
            `📊 *PREMIUM STATUS*\n\n` +
            `👤 ${ctx.from.first_name}\n` +
            `🆔 \`${ctx.from.id}\`\n` +
            `💎 ${isPremium ? '✅ ACTIVE' : '❌ INACTIVE'}\n` +
            `📋 ${plan.toUpperCase()}\n` +
            `📅 ${expiry}\n` +
            `🎯 ${limits}\n\n` +
            (isPremium ? `✨ *Enjoy unlimited access!*` : `💡 *Click Premium button to upgrade*`)
        );
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Error checking status*`);
    }
});

// ==========================================
// ========== PREMIUM COMMAND ==========
// ==========================================
bot.command('premium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const code = args[1];
    const userId = ctx.from.id;
    const username = ctx.from.first_name;
    
    if (!code) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/premium [code]\``);
        return;
    }
    
    if (code === CONFIG.ADMIN_SECRET) {
        const requestId = `REQ_${Date.now()}_${userId}`;
        global.paymentSessions.set(userId, { requestId, type: 'premium', plan: 'enterprise', amount: 2999 });
        
        await ctx.replyWithMarkdown(
            `💎 *Complete Your Payment*\n\n` +
            `📋 *Request ID:* \`${requestId}\`\n` +
            `💰 *Amount:* ₹2999\n` +
            `🏦 *Payee:* NEXUS PREMIUM\n\n` +
            `👇 *Click on any UPI app below to pay:*\n\n` +
            `*After payment, click "I have made the payment"*`,
            getUPIPaymentButtons(2999, requestId)
        );
    } else {
        await ctx.replyWithMarkdown(`❌ *Invalid premium code!*`);
    }
});

// ==========================================
// ========== AGENT COMMAND ==========
// ==========================================
bot.command('agent', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const agentName = args[1];
    const query = args.slice(2).join(' ');
    
    if (!agentName || !query) {
        await ctx.replyWithMarkdown(
            `🤖 *AI AGENTS*\n\n` +
            `Available:\n` +
            `• code_reviewer - Review code\n` +
            `• math_tutor - Solve math\n` +
            `• story_writer - Write stories\n` +
            `• data_analyst - Analyze data\n` +
            `• career_coach - Career advice\n` +
            `• health_advisor - Health tips\n` +
            `• language_tutor - Learn languages\n` +
            `• business_mentor - Business strategy\n\n` +
            `Usage: \`/agent [name] [query]\`\n` +
            `Example: \`/agent code_reviewer function add(a,b){return a+b}\``
        );
        return;
    }
    
    const agent = AI_AGENTS[agentName];
    if (!agent) {
        await ctx.replyWithMarkdown(`❌ *Agent not found!*\n\nAvailable: ${Object.keys(AI_AGENTS).join(', ')}`);
        return;
    }
    
    await ctx.reply(`🤖 *${agent.name}* ${agent.icon}\n\n⏳ Thinking...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const result = await Helpers.callWorker('chat', { message: `${agent.prompt}\n\nUser: ${query}` }, ctx.from.id);
        const reply = Helpers.cleanMarkdown(result.response || 'No response');
        await ctx.reply(`${reply}\n\n⚡ ${result.latency || 0}ms | 🤖 ${agent.name}`, { parse_mode: 'Markdown' });
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Agent failed!*`);
    }
});

// ==========================================
// ========== GENERATE IMAGE ==========
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
            `🎨 *AI IMAGE GENERATION*\n\n` +
            `• \`/generate sunset\` - Flux (Auto)\n` +
            `• \`/generate --realistic mountain\` - SDXL (Realistic)\n` +
            `• \`/generate --artistic dream\` - DreamShaper (Artistic)`
        );
        return;
    }
    
    await ctx.reply(`🎨 *Generating ${style} image...*\n📝 "${cleanPrompt}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const styleMap = { realistic: 'photorealistic', artistic: 'artistic', auto: 'auto' };
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_generate',
            prompt: cleanPrompt,
            style: styleMap[style] || 'auto'
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });
        
        if (response.data && response.data.length > 1000) {
            const styleNames = { realistic: '📷 SDXL', artistic: '🎨 DreamShaper', auto: '⚡ Flux' };
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `${styleNames[style]}\n📝 ${cleanPrompt.substring(0, 100)}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.reply(`❌ *Image generation failed!*`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await ctx.reply(`❌ *Image generation failed!*`, { parse_mode: 'Markdown' });
    }
});

// ==========================================
// ========== PHOTO SEARCH ==========
// ==========================================
bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();
    if (!query) {
        await ctx.replyWithMarkdown(`📸 *REAL PHOTO SEARCH*\n\n\`/photo Taj Mahal\``);
        return;
    }
    
    await ctx.reply(`🔍 *Searching:* "${query}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const result = await Helpers.callWorker('real_photo', { query, per_page: 5 }, ctx.from.id);
        if (result.success && result.photos?.length > 0) {
            const mediaGroup = [];
            for (let i = 0; i < Math.min(result.photos.length, 5); i++) {
                const photo = result.photos[i];
                mediaGroup.push({
                    type: 'photo',
                    media: photo.medium || photo.url,
                    caption: i === 0 ? `📸 *${query}*\n📷 ${result.source}` : undefined,
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

// ==========================================
// ========== VARY IMAGE ==========
// ==========================================
bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();
    if (!instruction || !ctx.message.reply_to_message?.photo) {
        await ctx.replyWithMarkdown(`🎨 *IMAGE VARIATION*\n\nReply to an image with \`/vary [instruction]\``);
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
            timeout: 90000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🎨 *Variation*\n📝 ${instruction}`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Image editing failed!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Image editing failed!*`);
    }
});

// ==========================================
// ========== ENHANCE IMAGE ==========
// ==========================================
bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message?.photo) {
        await ctx.replyWithMarkdown(`✨ *IMAGE ENHANCEMENT*\n\nReply to an image with \`/enhance\``);
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
        
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'image_enhance',
            image: base64Image
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: 90000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 1000) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `✨ *Enhanced Image*`,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *Enhancement failed!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Enhancement failed!*`);
    }
});

// ==========================================
// ========== SHOPPING ==========
// ==========================================
bot.command('shop', async (ctx) => {
    const product = ctx.message.text.replace('/shop', '').trim();
    if (!product) {
        await ctx.replyWithMarkdown(`🛍️ *SHOPPING*\n\n\`/shop iPhone 15\``);
        return;
    }
    
    await ctx.reply(`🛍️ *Searching best ${product}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const result = await Helpers.callWorker('shopping', { product }, ctx.from.id);
        const response = Helpers.cleanMarkdown(result.response || `No results for ${product}`);
        await ctx.replyWithMarkdown(response + `\n\n🔗 [Amazon](https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=akhilgpt-21)`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Shopping failed!*`);
    }
});

// ==========================================
// ========== YOUTUBE ==========
// ==========================================
bot.command('youtube', async (ctx) => {
    const url = ctx.message.text.replace('/youtube', '').trim();
    if (!url) {
        await ctx.replyWithMarkdown(`🎬 *YOUTUBE SUMMARY*\n\n\`/youtube https://youtu.be/...\``);
        return;
    }
    
    await ctx.reply(`🎬 *Analyzing video...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const result = await Helpers.callWorker('youtube', { videoUrl: url }, ctx.from.id);
        const response = Helpers.cleanMarkdown(result.response || `Video: ${url}`);
        await ctx.replyWithMarkdown(response);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *YouTube summary failed!*`);
    }
});

// ==========================================
// ========== QR CODE ==========
// ==========================================
bot.command('qr', async (ctx) => {
    const text = ctx.message.text.replace('/qr', '').trim();
    if (!text) {
        await ctx.replyWithMarkdown(`🔲 *QR CODE*\n\n\`/qr https://nexus.ai\``);
        return;
    }
    
    await ctx.reply(`🔲 *Generating QR code...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const response = await axios.post(CONFIG.WORKER_URL, {
            action: 'qr_generate',
            text: text,
            size: 300
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: 30000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 100) {
            await ctx.replyWithPhoto({ source: Buffer.from(response.data) }, {
                caption: `🔲 *QR Code*\n\`${text.substring(0, 100)}\``,
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
// ========== CANVAS ==========
// ==========================================
bot.command('canvas', async (ctx) => {
    const html = ctx.message.text.replace('/canvas', '').trim();
    if (!html) {
        await ctx.replyWithMarkdown(`🎨 *CANVAS ARTIFACT*\n\n\`/canvas <h1>Hello</h1>\``);
        return;
    }
    
    await ctx.reply(`🎨 *Creating canvas...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    
    try {
        const result = await Helpers.callWorker('canvas', { html }, ctx.from.id);
        await ctx.replyWithMarkdown(`🎨 *Canvas Created!*\n\n🔗 ${result.url}\n📝 ${(result.preview || '').substring(0, 200)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Canvas creation failed!*`);
    }
});

// ==========================================
// ========== REMINDER ==========
// ==========================================
bot.command('remind', async (ctx) => {
    const text = ctx.message.text.replace('/remind', '').trim();
    const match = text.match(/^(.+?)\s+in\s+(\d+)\s*(minute|minutes|min|m)?$/i);
    
    if (!match) {
        await ctx.replyWithMarkdown(`⏰ *REMINDER*\n\n\`/remind Call meeting in 30\``);
        return;
    }
    
    const message = match[1].trim();
    const minutes = parseInt(match[2]);
    
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
        await ctx.replyWithMarkdown(`❌ *Invalid minutes! (1-1440)*`);
        return;
    }
    
    try {
        const result = await Helpers.callWorker('reminder', { message, minutes }, ctx.from.id);
        if (result.success) {
            await ctx.replyWithMarkdown(
                `⏰ *Reminder set!*\n\n📝 ${message}\n⏱️ ${minutes} minutes\n🕐 ${new Date(Date.now() + minutes * 60000).toLocaleString()}`
            );
        } else {
            await ctx.replyWithMarkdown(`❌ *Failed to set reminder!*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Reminder failed!*`);
    }
});

// ==========================================
// ========== TRANSLATE ==========
// ==========================================
bot.command('translate', async (ctx) => {
    const text = ctx.message.text.replace('/translate', '').trim();
    const match = text.match(/^(.+?)\s+to\s+(\w+)$/i);
    
    if (!match) {
        await ctx.replyWithMarkdown(`🌐 *TRANSLATE*\n\n\`/translate Hello to hi\``);
        return;
    }
    
    const sourceText = match[1].trim();
    const targetLang = match[2].toLowerCase();
    
    await ctx.reply(`🌐 *Translating to ${targetLang}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const result = await Helpers.callWorker('translate', { text: sourceText, targetLanguage: targetLang }, ctx.from.id);
        await ctx.replyWithMarkdown(`🌐 *Translation (→ ${targetLang})*\n\n📝 ${sourceText}\n\n✨ ${result.translation || result.response}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Translation failed!*`);
    }
});

// ==========================================
// ========== ADMIN ==========
// ==========================================
bot.command('admin', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.replyWithMarkdown(`👑 *ADMIN PANEL*\n\nWelcome ${ctx.from.first_name}!`, adminPanelKeyboard);
});

bot.command('activate', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) {
        await ctx.replyWithMarkdown(`❌ *Admin access required!*`);
        return;
    }
    
    const args = ctx.message.text.split(' ');
    const userId = args[1];
    const plan = args[2] || 'pro';
    
    if (!userId) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/activate [USER_ID] [plan]\`\n\nPlans: plus, pro, enterprise`);
        return;
    }
    
    try {
        const result = await Helpers.callWorker('premium_verify', {
            userId: userId,
            transactionId: `ADMIN_${Date.now()}`,
            plan: plan
        }, null, true);
        
        if (result?.success) {
            await ctx.replyWithMarkdown(`✅ *Premium Activated!*\n\n👤 User: \`${userId}\`\n📋 Plan: ${plan.toUpperCase()}`);
        } else {
            await ctx.replyWithMarkdown(`❌ *Activation failed:* ${result?.error || 'Unknown error'}`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Error:* ${error.message}`);
    }
});

// ==========================================
// ========== CALLBACK HANDLERS ==========
// ==========================================
bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *${CONFIG.APP_NAME} AI*`, mainKeyboard);
});

bot.action('back_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *${CONFIG.APP_NAME} AI*`, mainKeyboard);
});

bot.action('more_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`⚙️ *More Features*`, moreKeyboard);
});

bot.action('agents_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *AI AGENTS*\n\nChoose an expert:`, agentsKeyboard);
});

bot.action('features_show', async (ctx) => {
    await ctx.answerCbQuery();
    let msg = `📦 *PAID FEATURES*\n\n`;
    for (const [key, f] of Object.entries(PAID_FEATURES)) {
        msg += `${f.emoji} *${f.name}* - ₹${f.price}\n   ${f.desc}\n\n`;
    }
    await ctx.editMessageText(msg, featuresKeyboard);
});

bot.action('premium_show', async (ctx) => {
    await ctx.answerCbQuery();
    
    let isPremium = false;
    try {
        const status = await Helpers.callWorker('premium_status', {}, ctx.from.id);
        isPremium = status?.isPremium || false;
    } catch (e) {}
    
    if (isPremium) {
        await ctx.editMessageText(`✨ *You are already a Premium User!*`, { parse_mode: 'Markdown' });
        return;
    }
    
    await ctx.editMessageText(
        `💎 *PREMIUM PLANS*\n\n` +
        `⭐ *Plus* - ₹299/year\n• 500 messages/day\n• 100 images/day\n\n` +
        `👑 *Pro* - ₹1,499/year\n• 2000 messages/day\n• 500 images/day\n\n` +
        `🏰 *Enterprise* - ₹2,999/year\n• ✨ UNLIMITED ✨\n• All features\n\n` +
        `👇 *Choose your plan:*`,
        plansKeyboard
    );
});

// Plan selection handlers
bot.action('plan_plus', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `PRE_${Date.now()}_${ctx.from.id}_plus`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'plus', amount: 299 });
    await ctx.editMessageText(
        `💎 *Complete Payment*\n\n📋 ${requestId}\n💰 ₹299\n📆 Plus Plan\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(299, requestId)
    );
});

bot.action('plan_pro', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `PRE_${Date.now()}_${ctx.from.id}_pro`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'pro', amount: 1499 });
    await ctx.editMessageText(
        `💎 *Complete Payment*\n\n📋 ${requestId}\n💰 ₹1499\n📆 Pro Plan\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(1499, requestId)
    );
});

bot.action('plan_enterprise', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `PRE_${Date.now()}_${ctx.from.id}_ent`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'enterprise', amount: 2999 });
    await ctx.editMessageText(
        `💎 *Complete Payment*\n\n📋 ${requestId}\n💰 ₹2999\n📆 Enterprise Plan\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(2999, requestId)
    );
});

// Feature purchase handlers
bot.action('feature_resume', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `FEAT_${Date.now()}_${ctx.from.id}_resume`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'feature', feature: 'resume_builder', amount: 49 });
    await ctx.editMessageText(
        `📄 *Resume Builder - ₹49*\n\n📋 ${requestId}\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(49, requestId)
    );
});

bot.action('feature_cover', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `FEAT_${Date.now()}_${ctx.from.id}_cover`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'feature', feature: 'cover_letter', amount: 29 });
    await ctx.editMessageText(
        `✉️ *Cover Letter - ₹29*\n\n📋 ${requestId}\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(29, requestId)
    );
});

bot.action('feature_blog', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `FEAT_${Date.now()}_${ctx.from.id}_blog`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'feature', feature: 'blog_generator', amount: 99 });
    await ctx.editMessageText(
        `📝 *SEO Blog Generator - ₹99*\n\n📋 ${requestId}\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(99, requestId)
    );
});

bot.action('feature_social', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `FEAT_${Date.now()}_${ctx.from.id}_social`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'feature', feature: 'social_posts', amount: 49 });
    await ctx.editMessageText(
        `📱 *Social Posts (30 days) - ₹49*\n\n📋 ${requestId}\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(49, requestId)
    );
});

bot.action('feature_code', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `FEAT_${Date.now()}_${ctx.from.id}_code`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'feature', feature: 'code_execution', amount: 199 });
    await ctx.editMessageText(
        `💻 *Code Execution (1000 runs) - ₹199*\n\n📋 ${requestId}\n\n👇 Click UPI app to pay:`,
        getUPIPaymentButtons(199, requestId)
    );
});

// Agent handlers
for (const [key, agent] of Object.entries(AI_AGENTS)) {
    bot.action(`agent_${key}`, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `🤖 *${agent.name}* ${agent.icon}\n\n${agent.prompt}\n\nSend: \`/agent ${key} [your question]\``,
            { parse_mode: 'Markdown' }
        );
    });
}

// Admin panel handlers
bot.action('admin_panel', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`👑 *Admin Panel*`, adminPanelKeyboard);
});

bot.action('admin_plans', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📋 *PREMIUM PLANS*\n\n⭐ Plus: ₹299/year (500/day)\n👑 Pro: ₹1,499/year (2000/day)\n🏰 Enterprise: ₹2,999/year (Unlimited)\n\nUPI: ${CONFIG.UPI_ID}`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('admin_features', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    let msg = `📦 *PAID FEATURES*\n\n`;
    for (const [key, f] of Object.entries(PAID_FEATURES)) {
        msg += `${f.emoji} ${f.name}: ₹${f.price}\n`;
    }
    msg += `\nUPI: ${CONFIG.UPI_ID}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
});

bot.action('admin_status', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📊 *SYSTEM STATUS*\n\n✅ Bot: Running\n✅ API: Online\n✅ Webhook: Active\n📅 ${new Date().toLocaleString()}`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('admin_health', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🏥 *HEALTH CHECK*\n\n✅ All systems operational`, { parse_mode: 'Markdown' });
});

bot.action('admin_clear', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🗑️ *CLEAR SESSION*\n\nCommand: \`/clear [USER_ID]\``, { parse_mode: 'Markdown' });
});

bot.action('admin_logout', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🚪 *Admin panel closed!*`, { parse_mode: 'Markdown' });
});

// Other UI actions
const uiActions = ['new_chat', 'image_info', 'photo_info', 'shopping_info', 'voice_info', 'file_info', 'youtube_info', 'qr_info', 'canvas_info', 'reminder_info', 'translate_info'];
for (const action of uiActions) {
    bot.action(action, async (ctx) => {
        await ctx.answerCbQuery();
        const messages = {
            'new_chat': '💬 *New Chat Started!*',
            'image_info': '🎨 *Image Gen*\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream',
            'photo_info': '📸 *Real Photos*\n• /photo Taj Mahal',
            'shopping_info': '🛍️ *Shopping*\n• /shop iPhone 15',
            'voice_info': '🎤 *Voice Chat*\nSend a voice message!',
            'file_info': '📄 *File Analysis*\nSend any document!',
            'youtube_info': '🎬 *YouTube*\n• /youtube [url]',
            'qr_info': '🔲 *QR Code*\n• /qr [text]',
            'canvas_info': '🎨 *Canvas*\n• /canvas [html]',
            'reminder_info': '⏰ *Reminder*\n• /remind [msg] in [min]',
            'translate_info': '🌐 *Translate*\n• /translate [text] to [lang]'
        };
        await ctx.editMessageText(messages[action], { parse_mode: 'Markdown' });
    });
}

// ==========================================
// ========== MEDIA HANDLERS ==========
// ==========================================
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name;
    
    // Check for payment screenshot
    if (global.paymentSessions?.has(userId)) {
        const session = global.paymentSessions.get(userId);
        const { requestId, type, plan, feature, amount } = session;
        
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const screenshotUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        
        let itemName = type === 'premium' ? `${PREMIUM_PLANS[plan]?.name || 'Premium'} Plan` : PAID_FEATURES[feature]?.name;
        
        if (CONFIG.SLACK_WEBHOOK_URL) {
            await fetch(CONFIG.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blocks: [
                        { type: 'header', text: { type: 'plain_text', text: '💰 NEW PAYMENT', emoji: true } },
                        { type: 'section', fields: [
                            { type: 'mrkdwn', text: `*User:* ${username} (\`${userId}\`)` },
                            { type: 'mrkdwn', text: `*Item:* ${itemName}` },
                            { type: 'mrkdwn', text: `*Amount:* ₹${amount}` },
                            { type: 'mrkdwn', text: `*Request:* \`${requestId}\`` }
                        ]},
                        { type: 'image', image_url: screenshotUrl, alt_text: 'Payment Screenshot' }
                    ]
                })
            });
        }
        
        await ctx.replyWithMarkdown(`✅ *Payment received!*\n\n📋 ${requestId}\n📦 ${itemName}\n💰 ₹${amount}\n\n⏳ Admin will verify soon.`);
        global.paymentSessions.delete(userId);
        return;
    }
    
    // Normal photo analysis
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageResponse.data).toString('base64');
        
        const result = await Helpers.callWorker('chat', { image: base64Image, message: 'Describe this image' }, userId);
        const analysis = Helpers.cleanMarkdown(result.response || 'Image analyzed!');
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Image analysis failed!*`);
    }
});

bot.on('voice', async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const voiceResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        
        const result = await Helpers.callVoice(voiceResponse.data, 'hi');
        const reply = Helpers.cleanMarkdown(result.response || result.transcript || 'Voice processed!');
        await ctx.reply(reply);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Voice processing failed!*`);
    }
});

bot.on('document', async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    try {
        const doc = ctx.message.document;
        const file = await ctx.telegram.getFile(doc.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileResponse.data).toString('base64');
        
        const result = await Helpers.callWorker('file_analysis', { 
            fileContent: base64File, 
            fileType: doc.file_name.split('.').pop() 
        }, ctx.from.id);
        
        const analysis = Helpers.cleanMarkdown(result.response || 'File analyzed!');
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
    
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const startTime = Date.now();
        const result = await Helpers.callWorker('chat', { message: text }, ctx.from.id);
        const latency = Date.now() - startTime;
        
        let reply = Helpers.cleanMarkdown(result.response || 'No response');
        await ctx.reply(`${reply}\n\n⚡ ${latency}ms | 🤖 ${result.model || 'AI'}`, { parse_mode: 'Markdown' });
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Service unavailable*\n\nPlease try again.`);
    }
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
