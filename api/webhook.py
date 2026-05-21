# ╔══════════════════════════════════════════════════════════════╗
# ║  NEXUS AI TELEGRAM BOT - CHATGPT LEVEL INTERFACE            ║
# ║  Secret Word Admin | Voice | Photo | File | Premium         ║
# ║  2026 Edition | Vercel Deployable                           ║
# ╚══════════════════════════════════════════════════════════════╝

from flask import Flask, request
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackQueryHandler
import requests
import os
import time
import base64
from urllib.parse import unquote

# ==========================================
# CONFIGURATION
# ==========================================
API_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api"
API_KEY = os.getenv("API_KEY", "akhil-123")
BOT_TOKEN = os.getenv("BOT_TOKEN", "8888091040:AAFAG_JKx7kG-H_S79bPQu__0aVcCHdGeaA")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "akhil123")
ADMIN_ID = "akhil"

app = Flask(__name__)
admin_sessions = {}

# ==========================================
# START — ChatGPT Style Welcome
# ==========================================
async def start(update, context):
    keyboard = [
        [InlineKeyboardButton("💬 New Chat", callback_data='new_chat')],
        [InlineKeyboardButton("🎨 Generate Image", callback_data='image_info')],
        [InlineKeyboardButton("📸 Search Photos", callback_data='photo_info')],
        [InlineKeyboardButton("⚙️ Settings", callback_data='settings')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🤖 *NEXUS AI — GPT-5.5 Level*\n\n"
        "👋 Hello! I'm NEXUS, your AI assistant.\n"
        "I can help with:\n"
        "• 💬 Chat & Questions\n"
        "• 🌐 Real-Time Web Search\n"
        "• 🎨 AI Image Generation\n"
        "• 📸 Real Photo Search\n"
        "• 📄 File Analysis\n"
        "• 🎤 Voice Chat\n\n"
        "💡 *Try:* `IPL score`, `Code likho`, `Kahani sunao`\n"
        "🔐 Whisper the secret for admin panel...",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

# ==========================================
# CHAT — ChatGPT Style Response
# ==========================================
async def chat(update, context):
    msg = update.message.text
    uid = update.effective_user.id
    username = update.effective_user.first_name or "User"
    
    # 👇 SECRET WORD DETECTOR — Auto Admin Panel!
    if msg.strip().lower() == ADMIN_SECRET:
        admin_sessions[uid] = {
            "active": True,
            "login_time": time.time(),
            "username": username
        }
        
        keyboard = [
            [InlineKeyboardButton("👑 Verify Premium", callback_data='admin_verify')],
            [InlineKeyboardButton("📊 Check Status", callback_data='admin_status')],
            [InlineKeyboardButton("❌ Revoke Premium", callback_data='admin_revoke')],
            [InlineKeyboardButton("📋 View Plans", callback_data='admin_plans')],
            [InlineKeyboardButton("🏥 System Health", callback_data='admin_health')],
            [InlineKeyboardButton("🗑️ Clear Session", callback_data='admin_clear')],
            [InlineKeyboardButton("🚪 Logout", callback_data='admin_logout')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"👑 *ADMIN PANEL UNLOCKED!*\n\n"
            f"Welcome, {username}!\n"
            f"🕐 {time.strftime('%H:%M:%S')}\n\n"
            f"Select an action below or just chat normally.\n"
            f"All your messages now have admin privileges!",
            parse_mode="Markdown",
            reply_markup=reply_markup
        )
        return
    
    # Show typing indicator
    await context.bot.send_chat_action(chat_id=uid, action="typing")
    
    # Headers
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    if uid in admin_sessions and admin_sessions[uid].get("active"):
        headers["X-User-ID"] = ADMIN_ID
    
    start_time = time.time()
    
    try:
        r = requests.post(
            f"{API_URL}/api",
            headers=headers,
            json={"action": "chat", "message": msg},
            timeout=60
        )
        
        if r.status_code == 200:
            data = r.json()
            reply = data.get('response', 'No response')
            model = data.get('model', 'AI')
            latency = data.get('latency', 0)
            is_premium = data.get('isPremium', False)
            
            # Admin badge
            prefix = "👑 *[ADMIN MODE]*\n\n" if uid in admin_sessions else ""
            premium_badge = "💎 Premium | " if is_premium else ""
            
            # Format response
            if len(reply) > 4000:
                chunks = [reply[i:i+4000] for i in range(0, len(reply), 4000)]
                for i, chunk in enumerate(chunks):
                    if i == len(chunks) - 1:
                        await update.message.reply_text(
                            f"{chunk}\n\n{premium_badge}⚡ {latency}ms | 🤖 {model}",
                            parse_mode="Markdown"
                        )
                    else:
                        await update.message.reply_text(chunk)
            else:
                await update.message.reply_text(
                    f"{prefix}{reply}\n\n{premium_badge}⚡ {latency}ms | 🤖 {model}",
                    parse_mode="Markdown"
                )
        else:
            await update.message.reply_text(
                "❌ *Service temporarily unavailable*\n\nPlease try again in a moment.",
                parse_mode="Markdown"
            )
    except Exception as e:
        await update.message.reply_text(
            "⚠️ *Connection timeout*\n\nPlease try again with a shorter message.",
            parse_mode="Markdown"
        )

# ==========================================
# PHOTO HANDLER — Vision Analysis
# ==========================================
async def photo_handler(update, context):
    uid = update.effective_user.id
    
    await context.bot.send_chat_action(chat_id=uid, action="typing")
    
    try:
        photo = await update.message.photo[-1].get_file()
        img_bytes = await photo.download_as_bytearray()
        img_base64 = base64.b64encode(bytes(img_bytes)).decode('utf-8')
        
        r = requests.post(
            f"{API_URL}/api",
            headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
            json={"action": "chat", "image": img_base64, "message": "Describe this image in detail"},
            timeout=60
        )
        
        if r.status_code == 200:
            data = r.json()
            analysis = data.get('analysis', data.get('response', 'Image analyzed!'))
            provider = data.get('provider', 'Vision AI')
            
            await update.message.reply_text(
                f"🔍 *Vision Analysis*\n\n{analysis}\n\n👁️ {provider}",
                parse_mode="Markdown"
            )
        else:
            await update.message.reply_text("❌ Image analysis failed!")
    except:
        await update.message.reply_text("❌ Error processing image!")

# ==========================================
# VOICE HANDLER
# ==========================================
async def voice_handler(update, context):
    uid = update.effective_user.id
    await context.bot.send_chat_action(chat_id=uid, action="typing")
    
    try:
        voice = await update.message.voice.get_file()
        voice_bytes = await voice.download_as_bytearray()
        
        r = requests.post(
            f"{API_URL}/voice-chat",
            headers={"X-API-Key": API_KEY},
            files={"audio": ("voice.ogg", bytes(voice_bytes), "audio/ogg")},
            data={"language": "hi"},
            timeout=60
        )
        
        if r.status_code == 200 and 'audio' in r.headers.get('Content-Type', ''):
            # Save and send voice reply
            with open('/tmp/reply.mp3', 'wb') as f:
                f.write(r.content)
            
            with open('/tmp/reply.mp3', 'rb') as f:
                await update.message.reply_voice(voice=f)
            
            # Send transcript
            transcript = r.headers.get('X-Transcript', '')
            response_text = r.headers.get('X-Response-Text', '')
            
            if transcript or response_text:
                try:
                    transcript = unquote(transcript)
                    response_text = unquote(response_text)
                except:
                    pass
                
                await update.message.reply_text(
                    f"📝 *You:* {transcript}\n🤖 *NEXUS:* {response_text}",
                    parse_mode="Markdown"
                )
        else:
            await update.message.reply_text("❌ Voice processing failed!")
    except:
        await update.message.reply_text("❌ Error processing voice!")

# ==========================================
# BUTTON HANDLER — Admin Panel Actions
# ==========================================
async def button_handler(update, context):
    query = update.callback_query
    await query.answer()
    uid = query.from_user.id
    data = query.data
    
    # Check admin
    if data.startswith('admin_') and uid not in admin_sessions:
        await query.edit_message_text("❌ Admin access required! Send the secret word first.")
        return
    
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY, "X-User-ID": ADMIN_ID}
    
    if data == 'new_chat':
        await query.edit_message_text("💬 *New Chat Started!*\n\nJust type your message below!", parse_mode="Markdown")
    
    elif data == 'image_info':
        await query.edit_message_text(
            "🎨 *AI Image Generation*\n\n"
            "Just type: `/generate [your prompt]`\n\n"
            "Example: `/generate Beautiful sunset over mountains`\n\n"
            "Styles: realistic, artistic, photorealistic",
            parse_mode="Markdown"
        )
    
    elif data == 'photo_info':
        await query.edit_message_text(
            "📸 *Real Photo Search*\n\n"
            "Just type: `/photo [search query]`\n\n"
            "Example: `/photo Taj Mahal`\n\n"
            "Get HD photos from Unsplash & Pixabay!",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_verify':
        await query.edit_message_text(
            "👑 *Verify Premium*\n\n"
            "Command: `/verify [user_id] [txn_id] [plan]`\n\n"
            "Example: `/verify testuser UTI123 pro`\n\n"
            "Plans: `plus`, `pro`, `enterprise`",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_status':
        await query.edit_message_text(
            "📊 *Check Status*\n\n"
            "Command: `/status [user_id]`\n\n"
            "Example: `/status testuser`",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_revoke':
        await query.edit_message_text(
            "❌ *Revoke Premium*\n\n"
            "Command: `/revoke [user_id]`\n\n"
            "Example: `/revoke testuser`",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_plans':
        r = requests.post(f"{API_URL}/api", headers=headers, json={"action": "premium_plans"})
        await query.edit_message_text(f"📋 *Premium Plans*\n\n```\n{r.text[:500]}\n```", parse_mode="Markdown")
    
    elif data == 'admin_health':
        r = requests.get(f"{API_URL}/health")
        data = r.json()
        await query.edit_message_text(
            f"🏥 *System Health*\n\n"
            f"📅 Date: {data.get('date','')}\n"
            f"🟢 Status: {data.get('status','')}\n"
            f"🤖 Models: {data.get('features',{}).get('models','')}\n"
            f"🔍 Search: {data.get('features',{}).get('webSearch','')} sources\n"
            f"🎨 Images: {data.get('features',{}).get('imageGen','')} engines",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_clear':
        await query.edit_message_text(
            "🗑️ *Clear Session*\n\n"
            "Command: `/clear [user_id]`\n\n"
            "Example: `/clear testuser`",
            parse_mode="Markdown"
        )
    
    elif data == 'admin_logout':
        admin_sessions.pop(uid, None)
        await query.edit_message_text("🚪 *Logged out!*\n\nSend the secret word again to login.", parse_mode="Markdown")
    
    elif data == 'settings':
        keyboard = [
            [InlineKeyboardButton("⌨️ Typing (ChatGPT Style)", callback_data='mode_typing')],
            [InlineKeyboardButton("⚡ Instant (Fastest)", callback_data='mode_burst')],
        ]
        await query.edit_message_text(
            "⚙️ *Streaming Mode*\n\nChoose how NEXUS responds:\n(Currently set in your API headers)",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

# ==========================================
# COMMANDS
# ==========================================
async def verify_cmd(update, context):
    if not context.args or len(context.args) < 3:
        return await update.message.reply_text("Usage: `/verify [user_id] [txn_id] [plan]`\nPlans: plus/pro/enterprise")
    
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY, "X-User-ID": ADMIN_ID}
    r = requests.post(
        f"{API_URL}/api",
        headers=headers,
        json={"action": "premium_verify", "userId": context.args[0], "transactionId": context.args[1], "plan": context.args[2]}
    )
    await update.message.reply_text(f"✅ *Result:*\n```\n{r.json().get('message','Done!')}\n```", parse_mode="Markdown")

async def status_cmd(update, context):
    uid = context.args[0] if context.args else update.effective_user.id
    r = requests.post(
        f"{API_URL}/api",
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY, "X-User-ID": str(uid)},
        json={"action": "premium_status"}
    )
    data = r.json()
    await update.message.reply_text(
        f"📊 *Premium Status*\n\n"
        f"👤 User: {data.get('userId','')}\n"
        f"💎 Plan: {data.get('plan','free')}\n"
        f"📅 Expiry: {data.get('premiumExpiry','N/A')}",
        parse_mode="Markdown"
    )

async def health_cmd(update, context):
    r = requests.get(f"{API_URL}/health")
    data = r.json()
    await update.message.reply_text(
        f"🏥 *NEXUS Health*\n\n"
        f"🟢 Status: {data.get('status','')}\n"
        f"📅 Date: {data.get('date','')}\n"
        f"🤖 Models: {data.get('features',{}).get('models','')}\n"
        f"🔍 Search: {data.get('features',{}).get('webSearch','')} sources",
        parse_mode="Markdown"
    )

async def clear_cmd(update, context):
    if not context.args:
        return await update.message.reply_text("Usage: `/clear [user_id]`")
    
    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY, "X-User-ID": ADMIN_ID}
    r = requests.post(f"{API_URL}/api", headers=headers, json={"action": "clear_session", "userId": context.args[0]})
    await update.message.reply_text(f"✅ {r.json().get('message','Done!')}")

async def generate_cmd(update, context):
    if not context.args:
        return await update.message.reply_text("Usage: `/generate [prompt]`\nExample: `/generate Beautiful sunset`")
    
    prompt = ' '.join(context.args)
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="upload_photo")
    
    r = requests.post(
        f"{API_URL}/api",
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
        json={"action": "image_generate", "prompt": prompt, "style": "artistic"},
        timeout=120
    )
    
    if r.status_code == 200:
        with open('/tmp/generated.png', 'wb') as f:
            f.write(r.content)
        with open('/tmp/generated.png', 'rb') as f:
            await update.message.reply_photo(photo=f, caption=f"🎨 *{prompt}*\n\n🤖 Generated by NEXUS AI", parse_mode="Markdown")
    else:
        await update.message.reply_text("❌ Image generation failed!")

async def photo_cmd(update, context):
    if not context.args:
        return await update.message.reply_text("Usage: `/photo [query]`\nExample: `/photo Taj Mahal`")
    
    query = ' '.join(context.args)
    
    r = requests.post(
        f"{API_URL}/api",
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
        json={"action": "real_photo", "query": query, "per_page": 5},
        timeout=30
    )
    
    if r.status_code == 200:
        data = r.json()
        photos = data.get('photos', [])
        if photos:
            # Send first photo with caption
            first = photos[0]
            await update.message.reply_photo(
                photo=first['medium'],
                caption=f"📸 *{query}*\n👤 {first['user']} | ❤️ {first['likes']}\n📷 Source: {data.get('source','Unknown')}",
                parse_mode="Markdown"
            )
            # Send remaining photos
            for photo in photos[1:]:
                await update.message.reply_photo(photo=photo['medium'])
        else:
            await update.message.reply_text(f"📸 No photos found for '{query}'!")
    else:
        await update.message.reply_text("❌ Photo search failed!")

# ==========================================
# BOT INITIALIZATION
# ==========================================
bot_app = Application.builder().token(BOT_TOKEN).build()

# Command handlers
bot_app.add_handler(CommandHandler("start", start))
bot_app.add_handler(CommandHandler("verify", verify_cmd))
bot_app.add_handler(CommandHandler("status", status_cmd))
bot_app.add_handler(CommandHandler("health", health_cmd))
bot_app.add_handler(CommandHandler("clear", clear_cmd))
bot_app.add_handler(CommandHandler("generate", generate_cmd))
bot_app.add_handler(CommandHandler("photo", photo_cmd))

# Message handlers
bot_app.add_handler(CallbackQueryHandler(button_handler))
bot_app.add_handler(MessageHandler(filters.PHOTO, photo_handler))
bot_app.add_handler(MessageHandler(filters.VOICE, voice_handler))
bot_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))

# ==========================================
# FLASK ROUTES
# ==========================================
@app.route("/api/webhook", methods=["POST"])
def webhook():
    try:
        data = request.get_json(force=True)
        update = Update.de_json(data, bot_app.bot)
        bot_app.update_queue.put(update)
        return "OK"
    except Exception as e:
        return f"Error: {str(e)}", 500

@app.route("/")
def home():
    return "🤖 NEXUS AI Bot — GPT-5.5 Level — 24x7 Live on Vercel!"

# ==========================================
# RUN (Local Development)
# ==========================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)