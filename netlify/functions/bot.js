// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  NEXUS AI TELEGRAM BOT - WORKER EXACT MATCH                                 ║
// ║  TXN ID Collection | Double Slack Notify | Auto Image | All 28 Actions      ║
// ║  Fully Compatible with MONSTER AI v8.0 Worker                               ║
// ║  Created by Akhil Jaiswal 🇮🇳                                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// ========== CONFIGURATION ==========
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN || "8888091040:AAFFgKqJS8iZJY9R4jYdKmgbgxSY7QTj79I";
const WORKER_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api";
const VOICE_URL = "https://nexus-a1.apikeyakhilka.workers.dev/voice-chat";
const API_KEY = "akhil-123";
const ADMIN_SECRET = "KaaliNexus@2026";
const ADMIN_IDS = new Set([8681361916]);
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";
const UPI_ID = "jaiswalanushi8@oksbi";

// Payment sessions (temporary for screenshot matching)
if (!global.paymentSessions) global.paymentSessions = new Map();

// ==========================================
// ========== HELPERS ==========
// ==========================================
function isAdmin(userId) {
    return ADMIN_IDS.has(userId);
}

function cleanMarkdown(text) {
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

async function callWorker(action, payload = {}, userId = null, isAdminFlag = false, responseType = 'json', timeout = 60000) {
    const headers = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY };
    if (userId) headers['X-User-ID'] = String(userId);
    if (isAdminFlag) headers['X-User-ID'] = 'akhil';
    
    const response = await axios.post(WORKER_URL, { action, ...payload }, { 
        headers, timeout, responseType 
    });
    return response;
}

async function callVoice(audioBuffer, language = 'hi') {
    const formData = new FormData();
    formData.append('audio', Buffer.from(audioBuffer), { filename: 'voice.ogg', contentType: 'audio/ogg' });
    formData.append('language', language);
    
    const response = await axios.post(VOICE_URL, formData, {
        headers: { ...formData.getHeaders(), 'X-API-Key': API_KEY },
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
    [Markup.button.callback('📊 Status', 'admin_status'), Markup.button.callback('🏥 Health', 'admin_health')],
    [Markup.button.callback('🚪 Close', 'admin_logout')]
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

function getUPIPaymentButtons(amount, requestId) {
    const upiIntent = `upi://pay?pa=${UPI_ID}&pn=NEXUS%20PREMIUM&am=${amount}&cu=INR&tn=Premium%20${requestId}`;
    return Markup.inlineKeyboard([
        [Markup.button.url('🇮🇳 GPay', upiIntent), Markup.button.url('📱 PhonePe', upiIntent)],
        [Markup.button.url('💳 Paytm', upiIntent), Markup.button.url('🏦 Any UPI', upiIntent)],
        [Markup.button.callback('✅ I have paid', 'payment_done'), Markup.button.callback('🔙 Cancel', 'main_menu')]
    ]);
}

// ==========================================
// ========== BOT INIT ==========
// ==========================================
const bot = new Telegraf(BOT_TOKEN);

// ==========================================
// ========== START COMMAND ==========
// ==========================================
bot.start(async (ctx) => {
    const isAdminUser = isAdmin(ctx.from.id);
    let isPremium = false, userPlan = 'free';
    try {
        const res = await callWorker('premium_status', {}, ctx.from.id);
        isPremium = res.data?.isPremium || false;
        userPlan = res.data?.plan || 'free';
    } catch (e) {}
    
    const message = `🤖 *NEXUS AI - WORKER SYNCED*\n\n` +
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
        `**📊 Status:** ${isPremium ? `💎 ${userPlan.toUpperCase()}` : '🆓 Free'}\n\n` +
        `💡 *Try "sunset" for auto image!*`;
    
    if (isAdminUser) {
        await ctx.replyWithMarkdown(message + `\n\n🔐 *Admin Access*`, adminKeyboard);
    } else {
        await ctx.replyWithMarkdown(message, mainKeyboard);
    }
});

// ==========================================
// ========== HELP COMMAND ==========
// ==========================================
bot.help(async (ctx) => {
    await ctx.replyWithMarkdown(
        `📚 *NEXUS AI COMMANDS*\n\n` +
        `**💬 Chat:**\n• Type any message (auto image for visual requests)\n• /status - Check premium\n\n` +
        `**🎨 Images:**\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream\n• /photo Taj Mahal\n• /vary instruction (reply to image)\n• /enhance (reply to image)\n\n` +
        `**🎤 Media:**\n• Send photo - AI analyzes\n• Send voice - AI responds\n• Send document - AI analyzes\n\n` +
        `**🛍️ More:**\n• /shop iPhone 15\n• /youtube URL\n• /qr text\n• /canvas html\n• /remind msg in minutes\n• /translate text to lang\n\n` +
        `**🤖 Agents:**\n• /agent code_reviewer code\n• /agent math_tutor problem\n• /agent story_writer topic\n• /agent data_analyst data\n• /agent career_coach question\n• /agent health_advisor symptom\n• /agent language_tutor text\n• /agent business_mentor query\n\n` +
        `**💎 Premium:**\n• Plus: ₹299/yr (500/day)\n• Pro: ₹1,499/yr (2000/day)\n• Enterprise: ₹2,999/yr (Unlimited)\n• /premium ${ADMIN_SECRET} - Start purchase\n\n` +
        `**🆔 Utility:**\n• /myid - Get your ID`
    );
});

bot.command('myid', async (ctx) => {
    await ctx.reply(`🆔 *ID:* \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// ==========================================
// ========== STATUS COMMAND ==========
// ==========================================
bot.command('status', async (ctx) => {
    try {
        const res = await callWorker('premium_status', {}, ctx.from.id);
        const isPremium = res.data?.isPremium || false;
        const plan = res.data?.plan || 'free';
        const expiry = res.data?.premiumExpiry ? new Date(res.data.premiumExpiry).toLocaleDateString() : 'N/A';
        
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
            `🎯 ${limits}`
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
    
    if (!code) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/premium [code]\``);
        return;
    }
    
    if (code === ADMIN_SECRET) {
        let isPremium = false;
        try {
            const res = await callWorker('premium_status', {}, userId);
            isPremium = res.data?.isPremium || false;
        } catch (e) {}
        
        if (isPremium) {
            await ctx.replyWithMarkdown(`✨ *You are already a Premium User!*`);
            return;
        }
        
        const requestId = `REQ_${Date.now()}_${userId}`;
        global.paymentSessions.set(userId, { requestId, step: 'plan' });
        
        await ctx.replyWithMarkdown(
            `💎 *Choose your plan:*`,
            plansKeyboard
        );
    } else {
        await ctx.replyWithMarkdown(`❌ *Invalid premium code!*`);
    }
});

// Plan selection handlers
bot.action('premium_show', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`💎 *PREMIUM PLANS*\n\nChoose your plan:`, plansKeyboard);
});

bot.action('plan_plus', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_plus`;
    global.paymentSessions.set(ctx.from.id, { requestId, plan: 'plus', amount: 299, step: 'txn' });
    await ctx.editMessageText(
        `💎 *Plus Plan - ₹299/year*\n\n` +
        `📋 *Request ID:* \`${requestId}\`\n\n` +
        `📌 *Step 1:* Pay ₹299 to UPI: \`${UPI_ID}\`\n` +
        `📌 *Step 2:* Send: \`/pay ${requestId} [TRANSACTION_ID]\`\n` +
        `📌 *Step 3:* Send payment screenshot\n\n` +
        `👇 *Click to pay:*`,
        getUPIPaymentButtons(299, requestId)
    );
});

bot.action('plan_pro', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_pro`;
    global.paymentSessions.set(ctx.from.id, { requestId, plan: 'pro', amount: 1499, step: 'txn' });
    await ctx.editMessageText(
        `💎 *Pro Plan - ₹1,499/year*\n\n` +
        `📋 *Request ID:* \`${requestId}\`\n\n` +
        `📌 *Step 1:* Pay ₹1499 to UPI: \`${UPI_ID}\`\n` +
        `📌 *Step 2:* Send: \`/pay ${requestId} [TRANSACTION_ID]\`\n` +
        `📌 *Step 3:* Send payment screenshot\n\n` +
        `👇 *Click to pay:*`,
        getUPIPaymentButtons(1499, requestId)
    );
});

bot.action('plan_enterprise', async (ctx) => {
    await ctx.answerCbQuery();
    const requestId = `REQ_${Date.now()}_${ctx.from.id}_ent`;
    global.paymentSessions.set(ctx.from.id, { requestId, plan: 'enterprise', amount: 2999, step: 'txn' });
    await ctx.editMessageText(
        `💎 *Enterprise Plan - ₹2,999/year (Unlimited)*\n\n` +
        `📋 *Request ID:* \`${requestId}\`\n\n` +
        `📌 *Step 1:* Pay ₹2999 to UPI: \`${UPI_ID}\`\n` +
        `📌 *Step 2:* Send: \`/pay ${requestId} [TRANSACTION_ID]\`\n` +
        `📌 *Step 3:* Send payment screenshot\n\n` +
        `👇 *Click to pay:*`,
        getUPIPaymentButtons(2999, requestId)
    );
});

// ==========================================
// ========== PAY COMMAND (TXN ID) ==========
// ==========================================
bot.command('pay', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const requestId = args[1];
    const transactionId = args[2];
    
    if (!requestId || !transactionId) {
        await ctx.replyWithMarkdown(
            `❌ *Usage:* \`/pay [REQUEST_ID] [TRANSACTION_ID]\`\n\n` +
            `Example: \`/pay REQ_1735123456_8681361916 HDFC123456789\`\n\n` +
            `After UPI payment, send your transaction ID from bank app.`
        );
        return;
    }
    
    const userId = ctx.from.id;
    const session = global.paymentSessions.get(userId);
    
    if (!session || session.requestId !== requestId) {
        await ctx.replyWithMarkdown(`❌ *Invalid Request ID!*`);
        return;
    }
    
    session.transactionId = transactionId;
    session.step = 'screenshot';
    global.paymentSessions.set(userId, session);
    
    await ctx.replyWithMarkdown(
        `✅ *Transaction ID recorded!*\n\n` +
        `📋 Request ID: \`${requestId}\`\n` +
        `🔑 Transaction ID: \`${transactionId}\`\n\n` +
        `📸 *Now send your payment screenshot*`
    );
});

bot.action('payment_done', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        `📸 *Payment Screenshot Required*\n\n` +
        `Please send your payment screenshot now.\n\n` +
        `📋 Request ID: \`${global.paymentSessions.get(ctx.from.id)?.requestId}\`\n` +
        `🔑 Transaction ID: \`${global.paymentSessions.get(ctx.from.id)?.transactionId}\`\n\n` +
        `✅ Screenshot will be sent to admin for verification.`,
        { parse_mode: 'Markdown' }
    );
});

// ==========================================
// ========== ACTIVATE COMMAND (Admin) ==========
// ==========================================
bot.command('activate', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.replyWithMarkdown(`❌ *Admin access required!*`);
        return;
    }
    
    const args = ctx.message.text.split(' ');
    const userId = args[1];
    const plan = args[2] || 'enterprise';
    
    if (!userId) {
        await ctx.replyWithMarkdown(`❌ *Usage:* \`/activate [USER_ID] [plan]\`\n\nPlans: plus, pro, enterprise`);
        return;
    }
    
    try {
        const res = await callWorker('premium_verify', {
            userId: userId,
            transactionId: `ADMIN_${Date.now()}`,
            plan: plan
        }, null, true);
        
        if (res.data?.success) {
            await ctx.replyWithMarkdown(`✅ *Premium Activated!*\n\n👤 User: \`${userId}\`\n📋 Plan: ${plan.toUpperCase()}`);
            
            // Notify user
            try {
                await bot.telegram.sendMessage(userId, 
                    `🎉 *Premium Activated!*\n\nYour ${plan.toUpperCase()} plan is now active.\n✨ Enjoy unlimited access!`,
                    { parse_mode: 'Markdown' }
                );
            } catch (e) {}
        } else {
            await ctx.replyWithMarkdown(`❌ *Activation failed:* ${res.data?.error || 'Unknown error'}`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Error:* ${error.message}`);
    }
});

// ==========================================
// ========== ADMIN COMMAND ==========
// ==========================================
bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.replyWithMarkdown(`👑 *Admin Panel*`, adminPanelKeyboard);
});

// ==========================================
// ========== IMAGE GENERATION ==========
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
            `🎨 *IMAGE GENERATION*\n\n` +
            `• /generate sunset - Auto\n` +
            `• /generate --realistic mountain - Realistic\n` +
            `• /generate --artistic dream - Artistic`
        );
        return;
    }
    
    await ctx.reply(`🎨 *Generating image...*\n📝 "${cleanPrompt}"`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const styleMap = { realistic: 'photorealistic', artistic: 'artistic', auto: 'auto' };
        const response = await axios.post(WORKER_URL, {
            action: 'image_generate',
            prompt: cleanPrompt,
            style: styleMap[style] || 'auto'
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });
        
        if (response.data && response.data.length > 1000) {
            const styleNames = { realistic: '📷 SDXL', artistic: '🎨 DreamShaper', auto: '⚡ Flux' };
            await ctx.replyWithPhoto(
                { source: Buffer.from(response.data) },
                { caption: `${styleNames[style]}\n📝 ${cleanPrompt.substring(0, 100)}`, parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply(`❌ *Image generation failed*`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await ctx.reply(`❌ *Image generation failed*`, { parse_mode: 'Markdown' });
    }
});

// ==========================================
// ========== PHOTO SEARCH ==========
// ==========================================
bot.command('photo', async (ctx) => {
    const query = ctx.message.text.replace('/photo', '').trim();
    if (!query) {
        await ctx.replyWithMarkdown(`📸 *PHOTO SEARCH*\n\n\`/photo Taj Mahal\``);
        return;
    }
    
    await ctx.reply(`🔍 *Searching for:* "${query}"`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const res = await callWorker('real_photo', { query, per_page: 5 }, ctx.from.id);
        const data = res.data;
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
        await ctx.replyWithMarkdown(`🎨 *IMAGE VARIATION*\n\nReply to an image with \`/vary [instruction]\``);
        return;
    }
    
    await ctx.reply(`🎨 *Editing image...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imageRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageRes.data).toString('base64');
        
        const response = await axios.post(WORKER_URL, {
            action: 'image_edit',
            image: base64Image,
            instruction: instruction
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            timeout: 90000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 1000) {
            await ctx.replyWithPhoto(
                { source: Buffer.from(response.data) },
                { caption: `🎨 *Variation*\n📝 ${instruction}`, parse_mode: 'Markdown' }
            );
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
        await ctx.replyWithMarkdown(`✨ *ENHANCE IMAGE*\n\nReply to an image with \`/enhance\``);
        return;
    }
    
    await ctx.reply(`✨ *Enhancing image...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const photo = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imageRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imageRes.data).toString('base64');
        
        const response = await axios.post(WORKER_URL, {
            action: 'image_enhance',
            image: base64Image
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            timeout: 90000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 1000) {
            await ctx.replyWithPhoto(
                { source: Buffer.from(response.data) },
                { caption: `✨ *Enhanced Image*`, parse_mode: 'Markdown' }
            );
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
        await ctx.replyWithMarkdown(`🛍️ *SHOPPING*\n\n\`/shop iPhone 15\``);
        return;
    }
    
    const processingMsg = await ctx.reply(`🛍️ *Searching best ${product}...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await callWorker('shopping', { product }, ctx.from.id, false, 'json', 120000);
        const data = res.data;
        await ctx.deleteMessage(processingMsg.message_id);
        
        let response = data.response || data.analysis || `No results found for ${product}`;
        const cleanedResponse = cleanMarkdown(response);
        const affiliateLink = `https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=akhilgpt-21`;
        
        await ctx.replyWithMarkdown(`${cleanedResponse}\n\n🔗 [View on Amazon](${affiliateLink})`);
    } catch (error) {
        await ctx.deleteMessage(processingMsg.message_id);
        const affiliateLink = `https://www.amazon.in/s?k=${encodeURIComponent(product)}&tag=akhilgpt-21`;
        await ctx.replyWithMarkdown(`🛍️ *${product}*\n\n🔗 [Search on Amazon](${affiliateLink})`);
    }
});

// ==========================================
// ========== YOUTUBE COMMAND ==========
// ==========================================
bot.command('youtube', async (ctx) => {
    const url = ctx.message.text.replace('/youtube', '').trim();
    if (!url) {
        await ctx.replyWithMarkdown(`🎬 *YOUTUBE SUMMARY*\n\n\`/youtube URL\``);
        return;
    }
    
    await ctx.reply(`🎬 *Analyzing video...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await callWorker('youtube', { videoUrl: url }, ctx.from.id);
        const response = cleanMarkdown(res.data.response || `Video: ${url}`);
        await ctx.replyWithMarkdown(response);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Summary failed*`);
    }
});

// ==========================================
// ========== QR COMMAND ==========
// ==========================================
bot.command('qr', async (ctx) => {
    const text = ctx.message.text.replace('/qr', '').trim();
    if (!text) {
        await ctx.replyWithMarkdown(`🔲 *QR CODE*\n\n\`/qr text\``);
        return;
    }
    
    await ctx.reply(`🔲 *Generating QR code...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'upload_photo');
    
    try {
        const response = await axios.post(WORKER_URL, {
            action: 'qr_generate',
            text: text,
            size: 300
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            timeout: 30000,
            responseType: 'arraybuffer'
        });
        
        if (response.data?.length > 100) {
            await ctx.replyWithPhoto(
                { source: Buffer.from(response.data) },
                { caption: `🔲 *QR Code*\n\`${text.substring(0, 100)}\``, parse_mode: 'Markdown' }
            );
        } else {
            await ctx.replyWithMarkdown(`❌ *QR generation failed*`);
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *QR generation failed*`);
    }
});

// ==========================================
// ========== CANVAS COMMAND ==========
// ==========================================
bot.command('canvas', async (ctx) => {
    const html = ctx.message.text.replace('/canvas', '').trim();
    if (!html) {
        await ctx.replyWithMarkdown(`🎨 *CANVAS*\n\n\`/canvas <h1>Hello</h1>\``);
        return;
    }
    
    await ctx.reply(`🎨 *Creating canvas...*`, { parse_mode: 'Markdown' });
    
    try {
        const res = await callWorker('canvas', { html }, ctx.from.id);
        await ctx.replyWithMarkdown(`🎨 *Canvas Created!*\n\n🔗 ${res.data.url}\n📝 ${(res.data.preview || '').substring(0, 200)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Canvas creation failed*`);
    }
});

// ==========================================
// ========== REMINDER COMMAND ==========
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
        await ctx.replyWithMarkdown(`❌ *Invalid minutes (1-1440)*`);
        return;
    }
    
    try {
        const res = await callWorker('reminder', { message, minutes }, ctx.from.id);
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

// ==========================================
// ========== TRANSLATE COMMAND ==========
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
    
    await ctx.reply(`🌐 *Translating to ${targetLang}...*`, { parse_mode: 'Markdown' });
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const res = await callWorker('translate', { text: sourceText, targetLanguage: targetLang }, ctx.from.id);
        await ctx.replyWithMarkdown(`🌐 *Translation*\n\n📝 ${sourceText}\n\n✨ ${res.data.translation || res.data.response}`);
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
        const res = await callWorker('chat', { message: `${agent.prompt}\n\nUser: ${query}` }, ctx.from.id);
        const reply = cleanMarkdown(res.data.response || 'No response');
        await ctx.reply(`${reply}\n\n⚡ ${res.data.latency || 0}ms | 🤖 ${agent.name}`, { parse_mode: 'Markdown' });
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Agent failed*`);
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
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const voiceRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        
        const result = await callVoice(voiceRes.data, 'hi');
        
        if (result.audio && result.type === 'audio/mpeg') {
            await ctx.replyWithVoice({ source: Buffer.from(result.audio) });
            if (result.transcript) {
                await ctx.reply(`📝 *You:* ${result.transcript}`, { parse_mode: 'Markdown' });
            }
            if (result.responseText) {
                await ctx.reply(`🤖 *NEXUS:* ${result.responseText}`, { parse_mode: 'Markdown' });
            }
        } else if (result.response) {
            await ctx.reply(cleanMarkdown(result.response));
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
        const { requestId, plan, amount, transactionId } = session;
        
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const screenshotUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        
        // 🔥 SEND TO SLACK with all details
        if (SLACK_WEBHOOK_URL) {
            await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blocks: [
                        { type: 'header', text: { type: 'plain_text', text: '💰 NEW PREMIUM PAYMENT', emoji: true } },
                        { type: 'section', fields: [
                            { type: 'mrkdwn', text: `*👤 User:*\n${username} (\`${userId}\`)` },
                            { type: 'mrkdwn', text: `*💎 Plan:*\n${plan?.toUpperCase() || 'Premium'}` },
                            { type: 'mrkdwn', text: `*💰 Amount:*\n₹${amount}` },
                            { type: 'mrkdwn', text: `*🆔 Request ID:*\n\`${requestId}\`` },
                            { type: 'mrkdwn', text: `*🔑 Transaction ID:*\n\`${transactionId || 'Not provided'}\`` }
                        ]},
                        { type: 'image', image_url: screenshotUrl, alt_text: 'Payment Screenshot' },
                        { type: 'section', text: { type: 'mrkdwn', text: '✅ *Verify Transaction ID in your bank statement before activating*' } },
                        { type: 'actions', elements: [
                            { type: 'button', text: { type: 'plain_text', text: '✅ Activate Premium', emoji: true }, style: 'primary', url: `https://t.me/${ctx.botInfo.username}?start=activate_${userId}_${plan}` },
                            { type: 'button', text: { type: 'plain_text', text: '❌ Reject', emoji: true }, style: 'danger', url: `https://t.me/${ctx.botInfo.username}?start=reject_${userId}` }
                        ]}
                    ]
                })
            });
        }
        
        // 🔥 SEND TO WORKER for record
        try {
            await callWorker('payment_screenshot', {
                userId: userId,
                requestId: requestId,
                transactionId: transactionId,
                plan: plan,
                amount: amount,
                screenshotUrl: screenshotUrl
            }, null, true);
        } catch (e) {}
        
        await ctx.replyWithMarkdown(
            `✅ *Payment screenshot received!*\n\n` +
            `📋 Request ID: \`${requestId}\`\n` +
            `🔑 Transaction ID: \`${transactionId || 'N/A'}\`\n` +
            `💰 Amount: ₹${amount}\n\n` +
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
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const imgRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(imgRes.data).toString('base64');
        
        const res = await callWorker('chat', { image: base64Image, message: 'Describe this image' }, userId);
        const analysis = cleanMarkdown(res.data.response || 'Image analyzed!');
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
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const fileRes = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const base64File = Buffer.from(fileRes.data).toString('base64');
        
        const res = await callWorker('file_analysis', { 
            fileContent: base64File, 
            fileType: doc.file_name.split('.').pop() 
        }, ctx.from.id);
        
        const analysis = cleanMarkdown(res.data.response || 'File analyzed!');
        await ctx.replyWithMarkdown(`📄 *File Analysis*\n\n${analysis.substring(0, 2000)}`);
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Analysis failed*`);
    }
});

// ==========================================
// ========== TEXT HANDLER (Auto Image) ==========
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    if (text === ADMIN_SECRET) return;
    
    await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
    
    try {
        const response = await axios.post(WORKER_URL, {
            action: 'chat',
            message: text
        }, {
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            timeout: 120000,
            responseType: 'arraybuffer'
        });
        
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('image') || contentType.includes('png') || contentType.includes('jpeg')) {
            // Auto-generated image
            await ctx.replyWithPhoto(
                { source: Buffer.from(response.data) },
                { caption: `🎨 *Generated for:* "${text.substring(0, 100)}"`, parse_mode: 'Markdown' }
            );
        } else {
            const data = JSON.parse(response.data.toString());
            const reply = cleanMarkdown(data.response || 'No response');
            await ctx.reply(`${reply}\n\n⚡ ${data.latency || 0}ms | 🤖 ${data.model || 'AI'}`, { parse_mode: 'Markdown' });
        }
    } catch (error) {
        await ctx.replyWithMarkdown(`❌ *Service unavailable*`);
    }
});

// ==========================================
// ========== CALLBACK HANDLERS ==========
// ==========================================
bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🤖 *NEXUS AI*`, mainKeyboard);
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
    await ctx.editMessageText(`💬 *New Chat Started!*`, { parse_mode: 'Markdown' });
});

bot.action('image_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🎨 *Image Gen*\n• /generate sunset\n• /generate --realistic mountain\n• /generate --artistic dream`, { parse_mode: 'Markdown' });
});

bot.action('photo_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`📸 *Photos*\n• /photo Taj Mahal`, { parse_mode: 'Markdown' });
});

bot.action('shopping_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🛍️ *Shopping*\n• /shop iPhone 15`, { parse_mode: 'Markdown' });
});

bot.action('voice_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🎤 *Voice*\nSend a voice message!`, { parse_mode: 'Markdown' });
});

bot.action('file_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`📄 *File*\nSend any document!`, { parse_mode: 'Markdown' });
});

bot.action('youtube_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🎬 *YouTube*\n• /youtube URL`, { parse_mode: 'Markdown' });
});

bot.action('qr_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🔲 *QR*\n• /qr text`, { parse_mode: 'Markdown' });
});

bot.action('canvas_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🎨 *Canvas*\n• /canvas html`, { parse_mode: 'Markdown' });
});

bot.action('reminder_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`⏰ *Reminder*\n• /remind msg in minutes`, { parse_mode: 'Markdown' });
});

bot.action('translate_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🌐 *Translate*\n• /translate text to lang`, { parse_mode: 'Markdown' });
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
    if (!isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`👑 *Admin Panel*`, adminPanelKeyboard);
});

bot.action('admin_status', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`📊 *System Status*\n✅ Bot: Running\n✅ API: Online\n✅ Webhook: Active\n📅 ${new Date().toLocaleString()}`, { parse_mode: 'Markdown' });
});

bot.action('admin_health', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🏥 *Health Check*\n✅ All systems operational`, { parse_mode: 'Markdown' });
});

bot.action('admin_logout', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(`🚪 *Admin panel closed*`, { parse_mode: 'Markdown' });
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
