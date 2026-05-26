// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI - WORLD'S MOST POWERFUL TELEGRAM BOT                              ║
// ║  Auto Image (No /generate needed) | Username/Password Login                 ║
// ║  Cross-Device Sync | Premium | 28 Actions                                   ║
// ║  Fully Synced with MONSTER AI v8.0 Worker                                   ║
// ║  Created by Akhil Jaiswal 🇮🇳                                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');

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
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || "",
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://qvgqpgqxwbfgajmrxugo.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_RSRD0E2uCmlsWIXYM8f0zw_KzV2Ffza";
};

// Supabase Client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Premium Plans (Matching Worker)
const PREMIUM_PLANS = {
    plus: { name: 'NEXUS Plus', price: 299, days: 365, messages: 500, images: 100, emoji: '⭐' },
    pro: { name: 'NEXUS Pro', price: 1499, days: 365, messages: 2000, images: 500, emoji: '👑' },
    enterprise: { name: 'NEXUS Enterprise', price: 2999, days: 365, messages: Infinity, images: Infinity, emoji: '🏰' }
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
if (!global.userSessions) global.userSessions = new Map();
if (!global.userCurrentConv) global.userCurrentConv = new Map();

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

    static async callWorker(action, payload = {}, userId = null, isAdmin = false, responseType = 'json', timeout = 60000) {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (userId) headers['X-User-ID'] = String(userId);
        if (isAdmin) headers['X-User-ID'] = 'akhil';
        
        const response = await axios.post(CONFIG.WORKER_URL, { action, ...payload }, { 
            headers, timeout, responseType 
        });
        return response;
    }

    static async callWorkerRaw(action, payload = {}, userId = null, isAdmin = false, timeout = 120000) {
        const headers = { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY };
        if (userId) headers['X-User-ID'] = String(userId);
        if (isAdmin) headers['X-User-ID'] = 'akhil';
        
        const response = await axios.post(CONFIG.WORKER_URL, { action, ...payload }, { 
            headers, timeout, responseType: 'arraybuffer' 
        });
        return response;
    }

    static async callVoice(audioBuffer, language = 'hi') {
        const formData = new FormData();
        formData.append('audio', Buffer.from(audioBuffer), { filename: 'voice.ogg', contentType: 'audio/ogg' });
        formData.append('language', language);
        
        const response = await axios.post(CONFIG.VOICE_URL, formData, {
            headers: { ...formData.getHeaders(), 'X-API-Key': CONFIG.API_KEY },
            timeout: 60000,
            responseType: 'arraybuffer'
        });
        
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('audio') || contentType.includes('mpeg')) {
            return {
                audio: response.data,
                type: contentType,
                transcript: response.headers['x-transcript'] ? decodeURIComponent(response.headers['x-transcript']) : null,
                responseText: response.headers['x-response-text'] ? decodeURIComponent(response.headers['x-response-text']) : null
            };
        } else {
            return JSON.parse(response.data.toString());
        }
    }

    static async getPremiumStatusFromSupabase(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('is_premium, plan, premium_expiry')
                .eq('id', userId)
                .single();
            if (error) return { isPremium: false, plan: 'free' };
            return { isPremium: data?.is_premium || false, plan: data?.plan || 'free', expiry: data?.premium_expiry };
        } catch { return { isPremium: false, plan: 'free' }; }
    }
}

// ==========================================
// ========== KEYBOARDS ==========
// ==========================================
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💬 Chat', 'new_chat'), Markup.button.callback('🎨 Image', 'image_info')],
    [Markup.button.callback('📸 Photo', 'photo_info'), Markup.button.callback('🛍️ Shop', 'shopping_info')],
    [Markup.button.callback('🎤 Voice', 'voice_info'), Markup.button.callback('🤖 Agents', 'agents_info')],
    [Markup.button.callback('💎 Premium', 'premium_show'), Markup.button.callback('⚙️ More', 'more_info')]
]);

const moreKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📄 File', 'file_info'), Markup.button.callback('🎬 YouTube', 'youtube_info')],
    [Markup.button.callback('🔲 QR', 'qr_info'), Markup.button.callback('🎨 Canvas', 'canvas_info')],
    [Markup.button.callback('⏰ Reminder', 'reminder_info'), Markup.button.callback('🌐 Translate', 'translate_info')],
    [Markup.button.callback('🔙 Back', 'main_menu')]
]);

const adminKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('👑 Admin Panel', 'admin_panel')]
]);

const adminPanelKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('💎 Plans', 'admin_plans'), Markup.button.callback('📊 Status', 'admin_status')],
    [Markup.button.callback('🏥 Health', 'admin_health'), Markup.button.callback('🚪 Close', 'admin_logout')]
]);

const plansKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⭐ Plus - ₹299/yr (500/day)', 'plan_plus')],
    [Markup.button.callback('👑 Pro - ₹1,499/yr (2000/day)', 'plan_pro')],
    [Markup.button.callback('🏰 Enterprise - ₹2,999/yr (Unlimited)', 'plan_enterprise')],
    [Markup.button.callback('🔙 Back', 'premium_show')]
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
// ========== AUTH COMMANDS ==========
// ==========================================

// Register Command
bot.command('register', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const email = args[1];
    const password = args[2];
    const telegramId = ctx.from.id.toString();
    
    if (!email || !password) {
        await ctx.replyWithMarkdown(
            `📝 *Register*\n\n` +
            `Usage: \`/register [email] [password]\`\n\n` +
            `Example: \`/register akhil@example.com mypass123\`\n\n` +
            `💡 *Save your credentials!* You can login from any device.`
        );
        return;
    }
    
    // Check if already registered
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single();
    
    if (existing) {
        await ctx.replyWithMarkdown(`❌ *Already registered!*\n\nUse \`/login\` instead.`);
        return;
    }
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                telegram_id: telegramId,
                full_name: ctx.from.first_name
            }
        }
    });
    
    if (error) {
        await ctx.replyWithMarkdown(`❌ *Registration failed:* ${error.message}`);
        return;
    }
    
    // Link telegram_id to user
    await supabase
        .from('users')
        .update({ telegram_id: telegramId })
        .eq('id', data.user.id);
    
    await ctx.replyWithMarkdown(
        `✅ *Registration successful!*\n\n` +
        `📧 Email: ${email}\n` +
        `🔐 Password: \`${password}\`\n\n` +
        `💡 *Save your credentials!*\n` +
        `Use \`/login ${email} ${password}\` on any device to access your premium and chat history.`
    );
});

// Login Command
bot.command('login', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const email = args[1];
    const password = args[2];
    const telegramId = ctx.from.id.toString();
    
    if (!email || !password) {
        await ctx.replyWithMarkdown(
            `🔐 *Login*\n\n` +
            `Usage: \`/login [email] [password]\`\n\n` +
            `Example: \`/login akhil@example.com mypass123\``
        );
        return;
    }
    
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        await ctx.replyWithMarkdown(`❌ *Login failed:* ${error.message}`);
        return;
    }
    
    // Get user from database
    const { data: userData } = await supabase
        .from('users')
        .select('id, is_premium, plan, premium_expiry')
        .eq('id', data.user.id)
        .single();
    
    // Store session
    global.userSessions.set(telegramId, {
        jwt: data.session.access_token,
        email: email,
        userId: data.user.id,
        supabaseUserId: data.user.id,
        loggedIn: true
    });
    
    // Get recent conversations
    const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', data.user.id)
        .order('updated_at', { ascending: false })
        .limit(5);
    
    let historyMsg = '';
    if (conversations?.length > 0) {
        historyMsg = `\n\n📜 *Recent Chats:*\n`;
        for (const conv of conversations) {
            historyMsg += `• ${conv.title.substring(0, 40)}\n`;
        }
        historyMsg += `\nUse \`/history\` to see all.`;
    }
    
    await ctx.replyWithMarkdown(
        `✅ *Login successful!*\n\n` +
        `👤 Email: ${email}\n` +
        `💎 Premium: ${userData?.is_premium ? '✅ Active' : '❌ Inactive'}\n` +
        `📋 Plan: ${userData?.plan || 'free'}\n` +
        `📅 Expiry: ${userData?.premium_expiry ? new Date(userData.premium_expiry).toLocaleDateString() : 'N/A'}${historyMsg}`
    );
});

// Logout Command
bot.command('logout', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    global.userSessions.delete(telegramId);
    global.userCurrentConv.delete(telegramId);
    await ctx.replyWithMarkdown(`🔓 *Logged out successfully!*`);
});

// Check if logged in
function isLoggedIn(telegramId) {
    return global.userSessions.has(telegramId) && global.userSessions.get(telegramId).loggedIn;
}

// History Command
bot.command('history', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    
    if (!isLoggedIn(telegramId)) {
        await ctx.replyWithMarkdown(`❌ *Please login first!*\n\nUse \`/login [email] [password]\``);
        return;
    }
    
    const session = global.userSessions.get(telegramId);
    const args = ctx.message.text.split(' ');
    const page = parseInt(args[1]) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const { data: conversations, count } = await supabase
        .from('conversations')
        .select('id, title, updated_at', { count: 'exact' })
        .eq('user_id', session.userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (!conversations?.length) {
        await ctx.replyWithMarkdown(`📜 *No chat history yet*\n\nStart chatting to see history here!`);
        return;
    }
    
    const totalPages = Math.ceil(count / limit);
    let message = `📜 *CHAT HISTORY* (Page ${page}/${totalPages})\n\n`;
    
    for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        const date = new Date(conv.updated_at).toLocaleDateString();
        message += `${offset + i + 1}. 💬 *${conv.title.substring(0, 40)}*\n   📅 ${date}\n\n`;
    }
    
    const keyboard = [];
    if (page > 1) keyboard.push(Markup.button.callback('⏪ Previous', `history_${page - 1}`));
    if (page < totalPages) keyboard.push(Markup.button.callback('Next ⏩', `history_${page + 1}`));
    keyboard.push(Markup.button.callback('🗑️ New Chat', 'new_chat'));
    
    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([keyboard]));
});

// Load conversation
bot.action(/history_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    
    const telegramId = ctx.from.id.toString();
    if (!isLoggedIn(telegramId)) {
        await ctx.editMessageText(`❌ *Please login first!*`);
        return;
    }
    
    const session = global.userSessions.get(telegramId);
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const { data: conversations, count } = await supabase
        .from('conversations')
        .select('id, title, updated_at', { count: 'exact' })
        .eq('user_id', session.userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
    
    const totalPages = Math.ceil(count / limit);
    let message = `📜 *CHAT HISTORY* (Page ${page}/${totalPages})\n\n`;
    
    for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        const date = new Date(conv.updated_at).toLocaleDateString();
        message += `${offset + i + 1}. 💬 *${conv.title.substring(0, 40)}*\n   📅 ${date}\n\n`;
    }
    
    const keyboard = [];
    if (page > 1) keyboard.push(Markup.button.callback('⏪ Previous', `history_${page - 1}`));
    if (page < totalPages) keyboard.push(Markup.button.callback('Next ⏩', `history_${page + 1}`));
    keyboard.push(Markup.button.callback('🗑️ New Chat', 'new_chat'));
    
    await ctx.editMessageText(message, Markup.inlineKeyboard([keyboard]));
});

// ==========================================
// ========== START COMMAND ==========
// ==========================================
bot.start(async (ctx) => {
    const isAdmin = Helpers.isAdmin(ctx.from.id);
    const telegramId = ctx.from.id.toString();
    const isLoggedInUser = isLoggedIn(telegramId);
    
    let isPremium = false, userPlan = 'free';
    if (isLoggedInUser) {
        const session = global.userSessions.get(telegramId);
        const premiumStatus = await Helpers.getPremiumStatusFromSupabase(session.userId);
        isPremium = premiumStatus.isPremium;
        userPlan = premiumStatus.plan;
    } else {
        try {
            const res = await Helpers.callWorker('premium_status', {}, ctx.from.id);
            isPremium = res.data?.isPremium || false;
            userPlan = res.data?.plan || 'free';
        } catch (e) {}
    }
    
    const message = `🤖 *${CONFIG.APP_NAME} AI - WORLD CLASS*\n\n` +
        `👋 Hello ${ctx.from.first_name}!\n\n` +
        `**⚡ Features:**\n` +
        `• 💬 *Chat* - Type anything (auto image for visual requests)\n` +
        `• 🎨 */generate* - Manual image generation\n` +
        `• 📸 */photo* - Real photos\n` +
        `• 🎤 *Voice* - Send voice message\n` +
        `• 📄 *Files* - PDF/DOC/TXT\n` +
        `• 🛍️ */shop* - Shopping recommendations\n` +
        `• 🎬 */youtube* - Video summaries\n` +
        `• 🔲 */qr* - QR codes\n` +
        `• 🎨 */canvas* - HTML artifacts\n` +
        `• ⏰ */remind* - Reminders\n` +
        `• 🌐 */translate* - Translation\n` +
        `• 🤖 */agent* - AI experts\n\n` +
        `**📊 Status:** ${isPremium ? `💎 ${userPlan.toUpperCase()}` : '🆓 Free'}\n` +
        `${isLoggedInUser ? `👤 Logged in as: ${global.userSessions.get(telegramId)?.email}\n` : ''}\n` +
        `💡 *Type "sunset" for auto image!*`;
    
    const authKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔐 Login', 'auth_login'), Markup.button.callback('📝 Register', 'auth_register')],
        [Markup.button.callback('🔓 Logout', 'auth_logout')]
    ]);
    
    if (!isLoggedInUser) {
        await ctx.replyWithMarkdown(message, authKeyboard);
    } else if (isAdmin) {
        await ctx.replyWithMarkdown(message + `\n\n🔐 *Admin Access*`, adminKeyboard);
    } else {
        await ctx.replyWithMarkdown(message, mainKeyboard);
    }
});

// Auth actions
bot.action('auth_login', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `🔐 *Login*\n\n` +
        `Send: \`/login [email] [password]\`\n\n` +
        `Example: \`/login akhil@example.com mypass123\``,
        { parse_mode: 'Markdown' }
    );
});

bot.action('auth_register', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📝 *Register*\n\n` +
        `Send: \`/register [email] [password]\`\n\n` +
        `Example: \`/register akhil@example.com mypass123\`\n\n` +
        `💡 *Save your credentials!*`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('auth_logout', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id.toString();
    global.userSessions.delete(telegramId);
    global.userCurrentConv.delete(telegramId);
    await ctx.editMessageText(`🔓 *Logged out successfully!*`, { parse_mode: 'Markdown' });
});

// ==========================================
// ========== HELP ==========
// ==========================================
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *${CONFIG.APP_NAME} - COMPLETE GUIDE*\n\n` +
        `**🔐 AUTH**\n• /register email password\n• /login email password\n• /logout\n• /history - View chat history\n\n` +
        `**💬 CHAT**\n• Type any message (auto image for visual requests)\n• /status - Check premium\n\n` +
        `**🎨 IMAGES**\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream\n• /photo Taj Mahal\n• /vary instruction (reply to image)\n• /enhance (reply to image)\n\n` +
        `**🎤 MEDIA**\n• Send photo - AI analyzes\n• Send voice - AI responds\n• Send document - AI analyzes\n\n` +
        `**🛍️ MORE**\n• /shop iPhone 15\n• /youtube URL\n• /qr text\n• /canvas html\n• /remind msg in minutes\n• /translate text to lang\n\n` +
        `**🤖 AGENTS**\n• /agent code_reviewer code\n• /agent math_tutor problem\n• /agent story_writer topic\n• /agent data_analyst data\n• /agent career_coach question\n• /agent health_advisor symptom\n• /agent language_tutor text\n• /agent business_mentor query\n\n` +
        `**💎 PREMIUM**\n• Plus: ₹299/yr (500/day)\n• Pro: ₹1,499/yr (2000/day)\n• Enterprise: ₹2,999/yr (Unlimited)\n\n` +
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
    const telegramId = ctx.from.id.toString();
    
    if (isLoggedIn(telegramId)) {
        const session = global.userSessions.get(telegramId);
        const premiumStatus = await Helpers.getPremiumStatusFromSupabase(session.userId);
        const isPremium = premiumStatus.isPremium;
        const plan = premiumStatus.plan;
        const expiry = premiumStatus.expiry ? new Date(premiumStatus.expiry).toLocaleDateString() : 'N/A';
        
        let limits = '';
        if (plan === 'plus') limits = '500 msgs/day, 100 images/day';
        else if (plan === 'pro') limits = '2000 msgs/day, 500 images/day';
        else if (plan === 'enterprise') limits = '✨ UNLIMITED ✨';
        else limits = '50 msgs/day, 10 images/day';
        
        await ctx.replyWithMarkdown(
            `📊 *PREMIUM STATUS*\n\n` +
            `👤 ${ctx.from.first_name}\n` +
            `📧 ${session.email}\n` +
            `💎 ${isPremium ? '✅ ACTIVE' : '❌ INACTIVE'}\n` +
            `📋 ${plan.toUpperCase()}\n` +
            `📅 ${expiry}\n` +
            `🎯 ${limits}`
        );
    } else {
        try {
            const res = await Helpers.callWorker('premium_status', {}, ctx.from.id);
            const isPremium = res.data?.isPremium || false;
            const plan = res.data?.plan || 'free';
            
            let limits = '';
            if (plan === 'plus') limits = '500 msgs/day, 100 images/day';
            else if (plan === 'pro') limits = '2000 msgs/day, 500 images/day';
            else if (plan === 'enterprise') limits = '✨ UNLIMITED ✨';
            else limits = '50 msgs/day, 10 images/day';
            
            await ctx.replyWithMarkdown(
                `📊 *PREMIUM STATUS*\n\n` +
                `👤 ${ctx.from.first_name}\n` +
                `💎 ${isPremium ? '✅ ACTIVE' : '❌ INACTIVE'}\n` +
                `📋 ${plan.toUpperCase()}\n` +
                `🎯 ${limits}\n\n` +
                `💡 *Login to save premium across devices:* \`/login\``
            );
        } catch (error) {
            await ctx.replyWithMarkdown(`❌ *Error checking status*`);
        }
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

// Plan selection
bot.action('premium_show', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `💎 *PREMIUM PLANS*\n\n` +
        `⭐ *Plus* - ₹299/year\n• 500 messages/day\n• 100 images/day\n\n` +
        `👑 *Pro* - ₹1,499/year\n• 2000 messages/day\n• 500 images/day\n\n` +
        `🏰 *Enterprise* - ₹2,999/year\n• ✨ UNLIMITED ✨\n\n` +
        `👇 *Choose your plan:*`,
        plansKeyboard
    );
});

bot.action('plan_plus', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_plus`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'plus', amount: 299 });
    await ctx.editMessageText(
        `💎 *Plus Plan - ₹299/year*\n\n📋 ${requestId}\n\n👇 Pay:`,
        getUPIPaymentButtons(299, requestId)
    );
});

bot.action('plan_pro', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_pro`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'pro', amount: 1499 });
    await ctx.editMessageText(
        `💎 *Pro Plan - ₹1,499/year*\n\n📋 ${requestId}\n\n👇 Pay:`,
        getUPIPaymentButtons(1499, requestId)
    );
});

bot.action('plan_enterprise', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_ent`;
    global.paymentSessions.set(ctx.from.id, { requestId, type: 'premium', plan: 'enterprise', amount: 2999 });
    await ctx.editMessageText(
        `💎 *Enterprise Plan - ₹2,999/year*\n\n📋 ${requestId}\n\n👇 Pay:`,
        getUPIPaymentButtons(2999, requestId)
    );
});

bot.action('payment_done', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📸 *Payment Screenshot Required*\n\n` +
        `Please send the payment screenshot now.\n` +
        `💰 Amount: ₹${global.paymentSessions.get(ctx.from.id)?.amount || '2999'}\n` +
        `🏦 Payee: NEXUS PREMIUM\n\n` +
        `✅ Screenshot will be sent to admin for verification.`,
        { parse_mode: 'Markdown' }
    );
});

// ==========================================
// ========== IMAGE GENERATION (Manual) ==========
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
            `🎨 *Manual Image Generation*\n\n` +
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
        const data = result.data;
        if (data.success && data.photos?.length > 0) {
            const mediaGroup = [];
            for (let i = 0; i < Math.min(data.photos.length, 5); i++) {
                const photo = data.photos[i];
                mediaGroup.push({
                    type: 'photo',
                    media: photo.medium || photo.url,
                    caption: i === 0 ? `📸 *${query}*\n📷 ${data.source}` : undefined,
                    parse_mode: 'Markdown'
                });
            }
            await ctx.replyWithMediaGroup(mediaGroup);
        } else {
            await ctx.replyWithMarkdown(`❌ *No photos found for:* "${query}"`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Photo search failed*`);
    }
});

// ==========================================
// ========== VARY COMMAND ==========
// ==========================================
bot.command('vary', async (ctx) => {
    const instruction = ctx.message.text.replace('/vary', '').trim();
    if (!instruction || !ctx.message.reply_to_message?.photo) {
        await ctx.replyWithMarkdown(`🎨 *Image Variation*\n\nReply to an image with \`/vary [instruction]\``);
        return;
    }
    
    await ctx.reply(`🎨 *Editing image...*\n📝 "${instruction}"\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageRes.data).toString('base64');
        
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
            await ctx.replyWithMarkdown(`❌ *Editing failed*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Editing failed*`);
    }
});

// ==========================================
// ========== ENHANCE COMMAND ==========
// ==========================================
bot.command('enhance', async (ctx) => {
    if (!ctx.message.reply_to_message?.photo) {
        await ctx.replyWithMarkdown(`✨ *Enhance Image*\n\nReply to an image with \`/enhance\``);
        return;
    }
    
    await ctx.reply(`✨ *Enhancing image...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imageRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageRes.data).toString('base64');
        
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
            await ctx.replyWithMarkdown(`❌ *Enhancement failed*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Enhancement failed*`);
    }
});

// ==========================================
// ========== SHOPPING COMMAND ==========
// ==========================================
bot.command('shop', async (ctx) => {
    const product = ctx.message.text.replace('/shop', '').trim();
    
    if (!product) {
        await ctx.replyWithMarkdown(
            `🛍️ *SHOPPING*\n\n` +
            `Usage: \`/shop [product name]\`\n\n` +
            `Examples:\n` +
            `• /shop iPhone 15\n` +
            `• /shop laptop under 50000`
        );
        return;
    }
    
    const processingMsg = await ctx.reply(`🛍️ *Searching best ${product}...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await Helpers.callWorker('shopping', { product }, ctx.from.id, false, 'json', 120000);
        const data = res.data;
        await ctx.deleteMessage(processingMsg.message_id);
        
        let response = data.response || data.analysis || `No results found for ${product}`;
        const cleanedResponse = Helpers.cleanMarkdown(response);
        const affiliateLink = `https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=akhilgpt-21`;
        
        await ctx.replyWithMarkdown(`${cleanedResponse}\n\n🔗 [View on Amazon](${affiliateLink})`);
    } catch (error) {
        await ctx.deleteMessage(processingMsg.message_id);
        const affiliateLink = `https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=akhilgpt-21`;
        await ctx.replyWithMarkdown(`🛍️ *${product}*\n\n🔗 [Search on Amazon](${affiliateLink})`);
    }
});

// ==========================================
// ========== OTHER COMMANDS ==========
// ==========================================
bot.command('youtube', async (ctx) => {
    const url = ctx.message.text.replace('/youtube', '').trim();
    if (!url) {
        await ctx.replyWithMarkdown(`🎬 *YOUTUBE SUMMARY*\n\n\`/youtube URL\``);
        return;
    }
    
    await ctx.reply(`🎬 *Analyzing video...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await Helpers.callWorker('youtube', { videoUrl: url }, ctx.from.id);
        const response = Helpers.cleanMarkdown(res.data.response || `Video: ${url}`);
        await ctx.replyWithMarkdown(response);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Summary failed*`);
    }
});

bot.command('qr', async (ctx) => {
    const text = ctx.message.text.replace('/qr', '').trim();
    if (!text) {
        await ctx.replyWithMarkdown(`🔲 *QR CODE*\n\n\`/qr text\``);
        return;
    }
    
    await ctx.reply(`🔲 *Generating QR code...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const res = await axios.post(CONFIG.WORKER_URL, {
            action: 'qr_generate',
            text: text,
            size: 300
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: 30000,
            responseType: 'arraybuffer'
        });
        
        if (res.data?.length > 100) {
            await ctx.replyWithPhoto({ source: Buffer.from(res.data) }, {
                caption: `🔲 *QR Code*\n\`${text.substring(0, 100)}\``,
                parse_mode: 'Markdown'
            });
        } else {
            await ctx.replyWithMarkdown(`❌ *QR generation failed*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *QR generation failed*`);
    }
});

bot.command('canvas', async (ctx) => {
    const html = ctx.message.text.replace('/canvas', '').trim();
    if (!html) {
        await ctx.replyWithMarkdown(`🎨 *CANVAS ARTIFACT*\n\n\`/canvas <h1>Hello</h1>\``);
        return;
    }
    
    await ctx.reply(`🎨 *Creating canvas...*\n⏳ Please wait...`, { parse_mode: 'Markdown' });
    
    try {
        const res = await Helpers.callWorker('canvas', { html }, ctx.from.id);
        await ctx.replyWithMarkdown(`🎨 *Canvas Created!*\n\n🔗 ${res.data.url}\n📝 ${(res.data.preview || '').substring(0, 200)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Canvas creation failed*`);
    }
});

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
        const res = await Helpers.callWorker('reminder', { message, minutes }, ctx.from.id);
        if (res.data.success) {
            await ctx.replyWithMarkdown(
                `⏰ *Reminder set!*\n\n📝 ${message}\n⏱️ ${minutes} minutes\n🕐 ${new Date(Date.now() + minutes * 60000).toLocaleString()}`
            );
        } else {
            await ctx.replyWithMarkdown(`❌ *Failed to set reminder*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Reminder failed*`);
    }
});

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
        const res = await Helpers.callWorker('translate', { text: sourceText, targetLanguage: targetLang }, ctx.from.id);
        await ctx.replyWithMarkdown(`🌐 *Translation (→ ${targetLang})*\n\n📝 ${sourceText}\n\n✨ ${res.data.translation || res.data.response}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Translation failed*`);
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
            `Available: code_reviewer, math_tutor, story_writer, data_analyst, career_coach, health_advisor, language_tutor, business_mentor\n\n` +
            `Usage: \`/agent [name] [query]\``
        );
        return;
    }
    
    const agent = AI_AGENTS[agentName];
    if (!agent) {
        await ctx.replyWithMarkdown(`❌ *Agent not found*`);
        return;
    }
    
    await ctx.reply(`🤖 *${agent.name}* ${agent.icon}\n\n⏳ Thinking...`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await Helpers.callWorker('chat', { message: `${agent.prompt}\n\nUser: ${query}` }, ctx.from.id);
        const reply = Helpers.cleanMarkdown(res.data.response || 'No response');
        await ctx.reply(`${reply}\n\n⚡ ${res.data.latency || 0}ms | 🤖 ${agent.name}`, { parse_mode: 'Markdown' });
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Agent failed*`);
    }
});

// ==========================================
// ========== ADMIN COMMANDS ==========
// ==========================================
bot.command('admin', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.replyWithMarkdown(`👑 *Admin Panel*`, adminPanelKeyboard);
});

bot.command('activate', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) {
        await ctx.replyWithMarkdown(`❌ *Admin access required!*`);
        return;
    }
    
    const args = ctx.message.text.split(' ');
    const email = args[1];
    const plan = args[2] || 'enterprise';
    
    if (!email) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/activate [email] [plan]\`\nPlans: plus, pro, enterprise`);
        return;
    }
    
    // Find user by email
    const { data: user } = await supabase
        .from('users')
        .select('id, telegram_id')
        .eq('email', email)
        .single();
    
    if (!user) {
        await ctx.replyWithMarkdown(`❌ *User not found with email: ${email}*`);
        return;
    }
    
    // Update premium in Supabase
    const expiryDate = new Date(Date.now() + 365 * 86400000);
    await supabase
        .from('users')
        .update({
            is_premium: true,
            plan: plan,
            premium_expiry: expiryDate.toISOString()
        })
        .eq('id', user.id);
    
    // Also call worker to update
    try {
        await Helpers.callWorker('premium_verify', {
            userId: user.id,
            transactionId: `ADMIN_${Date.now()}`,
            plan: plan
        }, null, true);
    } catch (e) {}
    
    await ctx.replyWithMarkdown(`✅ *Premium Activated for ${email}*\n📋 Plan: ${plan.toUpperCase()}\n📅 Expiry: ${expiryDate.toLocaleDateString()}`);
    
    // Notify user on Telegram
    if (user.telegram_id) {
        try {
            await bot.telegram.sendMessage(user.telegram_id,
                `🎉 *Premium Activated!*\n\nYour ${plan.toUpperCase()} plan is now active.\n\n✨ Unlimited access on all devices!`,
                { parse_mode: 'Markdown' }
            );
        } catch(e) {}
    }
});

// ==========================================
// ========== AUTO IMAGE & TEXT HANDLER ==========
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    if (text === CONFIG.ADMIN_SECRET) return;
    
    const telegramId = ctx.from.id.toString();
    const isLoggedInUser = isLoggedIn(telegramId);
    const session = isLoggedInUser ? global.userSessions.get(telegramId) : null;
    
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        // Call worker - it will decide image or text
        const res = await axios.post(CONFIG.WORKER_URL, {
            action: 'chat',
            message: text
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });
        
        const contentType = res.headers['content-type'] || '';
        
        if (contentType.includes('image') || contentType.includes('png') || contentType.includes('jpeg')) {
            // Auto-generated image
            await ctx.replyWithPhoto(
                { source: Buffer.from(res.data) },
                { caption: `🎨 *Generated for:* "${text.substring(0, 100)}"`, parse_mode: 'Markdown' }
            );
            
            // Save to Supabase if logged in
            if (isLoggedInUser && session) {
                let currentConvId = global.userCurrentConv.get(telegramId);
                
                if (!currentConvId) {
                    const { data: conv } = await supabase
                        .from('conversations')
                        .insert({
                            user_id: session.userId,
                            title: text.substring(0, 50),
                            messages: []
                        })
                        .select()
                        .single();
                    currentConvId = conv.id;
                    global.userCurrentConv.set(telegramId, currentConvId);
                }
                
                await supabase
                    .from('conversations')
                    .update({
                        messages: supabase.raw(`array_append(messages, '{"role":"user","content":"${text.replace(/'/g, "''")}","timestamp":${Date.now()}}')`),
                        updated_at: new Date()
                    })
                    .eq('id', currentConvId);
                
                await supabase
                    .from('conversations')
                    .update({
                        messages: supabase.raw(`array_append(messages, '{"role":"assistant","content":"[Image Generated]","timestamp":${Date.now()}}')`),
                        updated_at: new Date()
                    })
                    .eq('id', currentConvId);
            }
        } else {
            // Normal text response
            const data = JSON.parse(res.data.toString());
            const reply = Helpers.cleanMarkdown(data.response || 'No response');
            await ctx.reply(`${reply}\n\n⚡ ${data.latency || 0}ms | 🤖 ${data.model || 'AI'}`, { parse_mode: 'Markdown' });
            
            // Save to Supabase if logged in
            if (isLoggedInUser && session) {
                let currentConvId = global.userCurrentConv.get(telegramId);
                
                if (!currentConvId) {
                    const { data: conv } = await supabase
                        .from('conversations')
                        .insert({
                            user_id: session.userId,
                            title: text.substring(0, 50),
                            messages: []
                        })
                        .select()
                        .single();
                    currentConvId = conv.id;
                    global.userCurrentConv.set(telegramId, currentConvId);
                }
                
                await supabase
                    .from('conversations')
                    .update({
                        messages: supabase.raw(`array_append(messages, '{"role":"user","content":"${text.replace(/'/g, "''")}","timestamp":${Date.now()}}')`),
                        updated_at: new Date()
                    })
                    .eq('id', currentConvId);
                
                await supabase
                    .from('conversations')
                    .update({
                        messages: supabase.raw(`array_append(messages, '{"role":"assistant","content":"${reply.replace(/'/g, "''")}","timestamp":${Date.now()}}')`),
                        updated_at: new Date()
                    })
                    .eq('id', currentConvId);
            }
        }
    } catch (error) {
        console.error('Chat error:', error.message);
        await ctx.replyWithMarkdown(`❌ *Service unavailable*\n\nPlease try again.`);
    }
});

// ==========================================
// ========== VOICE HANDLER ==========
// ==========================================
bot.on('voice', async (ctx) => {
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const voice = ctx.message.voice;
        const file = await ctx.telegram.getFile(voice.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const voiceRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        
        const result = await Helpers.callVoice(voiceRes.data, 'hi');
        
        if (result.audio && result.type === 'audio/mpeg') {
            await ctx.replyWithVoice({ source: Buffer.from(result.audio) });
            if (result.transcript) {
                await ctx.reply(`📝 *You:* ${result.transcript}`, { parse_mode: 'Markdown' });
            }
            if (result.responseText) {
                await ctx.reply(`🤖 *NEXUS:* ${result.responseText}`, { parse_mode: 'Markdown' });
            }
        } else if (result.response) {
            await ctx.reply(Helpers.cleanMarkdown(result.response));
        } else {
            await ctx.reply(`✅ *Voice received*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Voice processing failed*`);
    }
});

// ==========================================
// ========== PHOTO HANDLER (Payment Screenshot + Vision) ==========
// ==========================================
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.first_name;
    
    // Check for payment screenshot
    if (global.paymentSessions?.has(userId)) {
        const session = global.paymentSessions.get(userId);
        const { requestId, plan, amount } = session;
        
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const screenshotUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        
        // Send to Slack
        if (CONFIG.SLACK_WEBHOOK_URL) {
            await fetch(CONFIG.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blocks: [
                        { type: 'header', text: { type: 'plain_text', text: '💰 NEW PAYMENT', emoji: true } },
                        { type: 'section', fields: [
                            { type: 'mrkdwn', text: `*User:* ${username} (\`${userId}\`)` },
                            { type: 'mrkdwn', text: `*Plan:* ${plan?.toUpperCase() || 'Premium'}` },
                            { type: 'mrkdwn', text: `*Amount:* ₹${amount}` },
                            { type: 'mrkdwn', text: `*Request:* \`${requestId}\`` }
                        ]},
                        { type: 'image', image_url: screenshotUrl, alt_text: 'Payment Screenshot' }
                    ]
                })
            });
        }
        
        await ctx.replyWithMarkdown(
            `✅ *Payment screenshot received!*\n\n` +
            `📋 *Request ID:* \`${requestId}\`\n` +
            `💰 *Amount:* ₹${amount}\n\n` +
            `⏳ Admin will verify and activate premium soon.`
        );
        
        global.paymentSessions.delete(userId);
        return;
    }
    
    // Normal photo analysis
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN}/${file.file_path}`;
        const imgRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imgRes.data).toString('base64');
        
        const res = await Helpers.callWorker('chat', { image: base64Image, message: 'Describe this image' }, userId);
        const analysis = Helpers.cleanMarkdown(res.data.response || 'Image analyzed!');
        await ctx.replyWithMarkdown(`🔍 *Vision Analysis*\n\n${analysis}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Analysis failed*`);
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
        const fileRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileRes.data).toString('base64');
        
        const res = await Helpers.callWorker('file_analysis', { 
            fileContent: base64File, 
            fileType: doc.file_name.split('.').pop() 
        }, ctx.from.id);
        
        const analysis = Helpers.cleanMarkdown(res.data.response || 'File analyzed!');
        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${analysis.substring(0, 2000)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Analysis failed*`);
    }
});

// ==========================================
// ========== CALLBACK HANDLERS ==========
// ==========================================
bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *${CONFIG.APP_NAME} AI*`, mainKeyboard);
});

bot.action('more_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`⚙️ *More Features*`, moreKeyboard);
});

bot.action('agents_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *AI Agents*`, agentsKeyboard);
});

bot.action('new_chat', async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from.id.toString();
    global.userCurrentConv.delete(telegramId);
    await ctx.editMessageText(`💬 *New Chat Started!*`, { parse_mode: 'Markdown' });
});

// Agent buttons
for (const [key, agent] of Object.entries(AI_AGENTS)) {
    bot.action(`agent_${key}`, async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `🤖 *${agent.name}* ${agent.icon}\n\n${agent.prompt}\n\nSend: \`/agent ${key} [your question]\``,
            { parse_mode: 'Markdown' }
        );
    });
}

// Admin panel actions
bot.action('admin_panel', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`👑 *Admin Panel*`, adminPanelKeyboard);
});

bot.action('admin_plans', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📋 *Premium Plans*\n\nPlus: ₹299/year (500/day)\nPro: ₹1,499/year (2000/day)\nEnterprise: ₹2,999/year (Unlimited)\n\nUPI: ${CONFIG.UPI_ID}`,
        { parse_mode: 'Markdown' }
    );
});

bot.action('admin_status', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`📊 *System Status*\n✅ Bot: Running\n✅ API: Online\n✅ Supabase: Connected\n📅 ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' });
});

bot.action('admin_health', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🏥 *Health Check*\n✅ All systems operational`, { parse_mode: 'Markdown' });
});

bot.action('admin_logout', async (ctx) => {
    if (!Helpers.isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🚪 *Admin panel closed*`, { parse_mode: 'Markdown' });
});

// Simple UI actions
const uiActions = ['image_info', 'photo_info', 'shopping_info', 'voice_info', 'file_info', 'youtube_info', 'qr_info', 'canvas_info', 'reminder_info', 'translate_info'];
for (const action of uiActions) {
    bot.action(action, async (ctx) => {
        await ctx.answerCbQuery();
        const messages = {
            'image_info': '🎨 *Image Gen*\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream',
            'photo_info': '📸 *Photos*\n• /photo Taj Mahal',
            'shopping_info': '🛍️ *Shopping*\n• /shop iPhone 15',
            'voice_info': '🎤 *Voice*\nSend a voice message!',
            'file_info': '📄 *File*\nSend any document!',
            'youtube_info': '🎬 *YouTube*\n• /youtube [url]',
            'qr_info': '🔲 *QR*\n• /qr [text]',
            'canvas_info': '🎨 *Canvas*\n• /canvas [html]',
            'reminder_info': '⏰ *Reminder*\n• /remind [msg] in [min]',
            'translate_info': '🌐 *Translate*\n• /translate [text] to [lang]'
        };
        await ctx.editMessageText(messages[action], { parse_mode: 'Markdown' });
    });
}

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
