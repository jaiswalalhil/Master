from flask import Flask, request
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackQueryHandler
import requests
import os
import time
import base64
from urllib.parse import unquote

# Config
API_URL = "https://nexus-a1.apikeyakhilka.workers.dev/api"
API_KEY = os.getenv("API_KEY", "akhil-123")
BOT_TOKEN = os.getenv("BOT_TOKEN", "8822432714:AAFAl8BC9wA8z4JLGUzhxWDa3Nth2TM8U5I")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "akhil123")
ADMIN_ID = "akhil"

app = Flask(__name__)
bot = None
telegram_app = None
admin_sessions = {}

# ==========================================
# HANDLERS
# =======================================
async def start(update, context):
    keyboard = [
        [InlineKeyboardButton("💬 Chat", callback_data='chat_info')],
        [InlineKeyboardButton("🎨 Image Gen", callback_data='image_info')],
        [InlineKeyboardButton("📸 Photos", callback_data='photo_info')],
        [InlineKeyboardButton("🔐 Admin", callback_data='admin_info')]
    ]
    await update.message.reply_text(
        "🤖 *NEXUS AI — GPT-5.5*\n\n💬 Chat | 🎨 Images | 📸 Photos\n🔐 Whisper secret for admin",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def chat(update, context):
    msg = update.message.text
    uid = update.effective_user.id

    # Secret word → Admin panel
    if msg.strip().lower() == ADMIN_SECRET:
        admin_sessions[uid] = {"active": True}
        keyboard = [
            [InlineKeyboardButton("👑 Verify Premium", callback_data='admin_verify')],
            [InlineKeyboardButton("📊 Check Status", callback_data='admin_status')],
            [InlineKeyboardButton("❌ Revoke Premium", callback_data='admin_revoke')],
            [InlineKeyboardButton("🏥 Health", callback_data='admin_health')],
            [InlineKeyboardButton("🚪 Logout", callback_data='admin_logout')]
        ]
        await update.message.reply_text("👑 *ADMIN PANEL!*", parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))
        return

    headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
    if uid in admin_sessions:
        headers["X-User-ID"] = ADMIN_ID

    await context.bot.send_chat_action(chat_id=uid, action="typing")
    r = requests.post(f"{API_URL}/api", headers=headers, json={"action": "chat", "message": msg}, timeout=60)

    if r.status_code == 200:
        data = r.json()
        prefix = "👑 " if uid in admin_sessions else ""
        reply = data.get('response', '')[:4000]
        await update.message.reply_text(f"{prefix}{reply}\n\n🤖 {data.get('model','AI')} | ⚡ {data.get('latency',0)}ms")

async def photo_handler(update, context):
    photo = await update.message.photo[-1].get_file()
    img_bytes = await photo.download_as_bytearray()
    img_base64 = base64.b64encode(bytes(img_bytes)).decode('utf-8')

    r = requests.post(f"{API_URL}/api", headers={"Content-Type":"application/json","X-API-Key":API_KEY}, json={"action":"chat","image":img_base64,"message":"Describe this image"})
    if r.status_code == 200:
        data = r.json()
        await update.message.reply_text(f"🔍 {data.get('analysis', data.get('response',''))}")

async def button_handler(update, context):
    query = update.callback_query
    await query.answer()
    uid = query.from_user.id
    headers = {"Content-Type":"application/json","X-API-Key":API_KEY,"X-User-ID":ADMIN_ID}

    actions = {
        'admin_info': "🔐 Send secret word: `akhil123`",
        'admin_verify': "`/verify [uid] [txn] [plan]`",
        'admin_status': "`/status [uid]`",
        'admin_revoke': "`/revoke [uid]`",
        'admin_health': "`/health`"
    }

    if query.data == 'admin_logout':
        admin_sessions.pop(uid, None)
        await query.edit_message_text("🚪 Logged out!")
    elif query.data in actions:
        await query.edit_message_text(actions[query.data], parse_mode="Markdown")

async def verify_cmd(update, context):
    if not context.args or len(context.args) < 3:
        return await update.message.reply_text("`/verify [uid] [txn] [plan]`")
    headers = {"Content-Type":"application/json","X-API-Key":API_KEY,"X-User-ID":ADMIN_ID}
    r = requests.post(f"{API_URL}/api", headers=headers, json={"action":"premium_verify","userId":context.args[0],"transactionId":context.args[1],"plan":context.args[2]})
    await update.message.reply_text(f"✅ {r.json().get('message','Done!')}")

async def status_cmd(update, context):
    uid = context.args[0] if context.args else "testuser"
    r = requests.post(f"{API_URL}/api", headers={"Content-Type":"application/json","X-API-Key":API_KEY}, json={"action":"premium_status"})
    await update.message.reply_text(f"📊 {r.json().get('plan','free')}")

async def health_cmd(update, context):
    r = requests.get(f"{API_URL}/health")
    await update.message.reply_text(f"🏥 {r.json().get('status','active')} | v{r.json().get('version','8.0')}")

# Build app
def init_bot():
    global telegram_app
    telegram_app = Application.builder().token(BOT_TOKEN).build()
    telegram_app.add_handler(CommandHandler("start", start))
    telegram_app.add_handler(CommandHandler("verify", verify_cmd))
    telegram_app.add_handler(CommandHandler("status", status_cmd))
    telegram_app.add_handler(CommandHandler("health", health_cmd))
    telegram_app.add_handler(CallbackQueryHandler(button_handler))
    telegram_app.add_handler(MessageHandler(filters.PHOTO, photo_handler))
    telegram_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, chat))

init_bot()

@app.route("/api/webhook", methods=["POST"])
def webhook():
    data = request.get_json(force=True)
    update = Update.de_json(data, telegram_app.bot)
    telegram_app.update_queue.put(update)
    return "OK"

@app.route("/")
def home():
    return "🤖 NEXUS AI Bot — 24x7 Live!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8080)))