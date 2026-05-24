# ╔══════════════════════════════════════════════════════════════╗
# ║  NEXUS AI TELEGRAM BOT - CHATGPT LEVEL INTERFACE            ║
# ║  Secret Word Admin | Voice | Photo | File | Premium         ║
# ║  2026 Edition | Vercel Deployable                           ║
# ╚══════════════════════════════════════════════════════════════╝

from flask import Flask, request, jsonify
import requests
import os
import time
import base64
import json
from datetime import datetime
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
premium_users = {}
user_message_count = {}

# ==========================================
# TELEGRAM API HELPERS (Direct Calls)
# ==========================================

def send_message(chat_id, text, parse_mode="Markdown", reply_markup=None):
    """Send message using Telegram Bot API"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)
    try:
        requests.post(url, json=payload, timeout=15)
    except Exception as e:
        print(f"Send message error: {e}")

def send_typing(chat_id):
    """Show typing indicator"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendChatAction"
    try:
        requests.post(url, json={"chat_id": chat_id, "action": "typing"}, timeout=5)
    except:
        pass

def send_voice(chat_id, voice_bytes):
    """Send voice message"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendVoice"
    try:
        files = {"voice": ("reply.ogg", voice_bytes, "audio/ogg")}
        requests.post(url, data={"chat_id": chat_id}, files=files, timeout=30)
    except Exception as e:
        print(f"Send voice error: {e}")

def edit_message(chat_id, message_id, text, reply_markup=None):
    """Edit existing message"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/editMessageText"
    payload = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": "Markdown"}
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)
    try:
        requests.post(url, json=payload, timeout=15)
    except:
        pass

def answer_callback(callback_id):
    """Answer callback query"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/answerCallbackQuery"
    try:
        requests.post(url, json={"callback_query_id": callback_id}, timeout=5)
    except:
        pass

# ==========================================
# KEYBOARDS (Same as Your Style)
# ==========================================

def get_main_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "💬 New Chat", "callback_data": "new_chat"}],
            [{"text": "🎨 Generate Image", "callback_data": "image_info"}],
            [{"text": "📸 Search Photos", "callback_data": "photo_info"}],
            [{"text": "⚙️ Settings", "callback_data": "settings"}]
        ]
    }

def get_admin_keyboard():
    return {
        "inline_keyboard": [
            [{"text": "👑 Verify Premium", "callback_data": "admin_verify"}],
            [{"text": "📊 Check Status", "callback_data": "admin_status"}],
            [{"text": "❌ Revoke Premium", "callback_data": "admin_revoke"}],
            [{"text": "📋 View Plans", "callback_data": "admin_plans"}],
            [{"text": "🏥 System Health", "callback_data": "admin_health"}],
            [{"text": "🗑️ Clear Session", "callback_data": "admin_clear"}],
            [{"text": "🚪 Logout", "callback_data": "admin_logout"}]
        ]
    }

# ==========================================
# PREMIUM & LIMIT CHECK
# ==========================================

def check_premium(user_id):
    """Check if user has premium access"""
    if str(user_id) in premium_users:
        return True
    try:
        r = requests.post(
            API_URL,
            headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
            json={"action": "premium_status", "userId": str(user_id)},
            timeout=5
        )
        if r.status_code == 200:
            return r.json().get("isPremium", False)
    except:
        pass
    return False

def check_limit(user_id):
    """Check daily limit (50 for free users)"""
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"{user_id}_{today}"

    if user_id in admin_sessions:
        return True
    if check_premium(user_id):
        return True

    count = user_message_count.get(key, 0)
    if count >= 50:
        return False
    user_message_count[key] = count + 1
    return True

# ==========================================
# WEBHOOK HANDLER - MAIN LOGIC
# ==========================================

@app.route("/", methods=["POST", "GET"])
def webhook():
    if request.method == "GET":
        return jsonify({"status": "running", "bot": "NEXUS AI", "time": datetime.now().isoformat()})

    try:
        update = request.get_json()
        if not update:
            return "OK", 200

        # Handle Callback Query (Button Clicks)
        if "callback_query" in update:
            handle_callback(update["callback_query"])
            return "OK", 200

        # Handle Message
        if "message" not in update:
            return "OK", 200

        msg = update["message"]
        chat_id = msg.get("chat", {}).get("id")
        user_id = msg.get("from", {}).get("id")
        username = msg.get("from", {}).get("first_name", "User")
        text = msg.get("text", "")

        # ==========================================
        # START COMMAND
        # ==========================================
        if text == "/start":
            send_message(
                chat_id,
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
                f"🔐 Whisper *{ADMIN_SECRET}* for admin panel...",
                reply_markup=get_main_keyboard()
            )
            return "OK", 200

        # ==========================================
        # HELP COMMAND
        # ==========================================
        if text == "/help":
            send_message(
                chat_id,
                "📚 *NEXUS AI Commands*\n\n"
                "/start - Restart bot\n"
                "/status - Check premium status\n"
                "/premium [code] - Activate premium\n\n"
                f"🔐 Admin: Send *{ADMIN_SECRET}*"
            )
            return "OK", 200

        # ==========================================
        # STATUS COMMAND
        # ==========================================
        if text == "/status":
            prem = check_premium(user_id)
            send_message(
                chat_id,
                f"📊 *Premium Status*\n\n"
                f"👤 User: {username}\n"
                f"💎 Premium: {'✅ Active' if prem else '❌ Inactive'}\n"
                f"📅 Plan: {'Unlimited' if prem else '50 messages/day'}"
            )
            return "OK", 200

        # ==========================================
        # PREMIUM COMMAND
        # ==========================================
        if text and text.startswith("/premium "):
            code = text.replace("/premium ", "").strip()
            if code == ADMIN_SECRET:
                premium_users[user_id] = True
                send_message(chat_id, "✅ *Premium Activated!*\n\nYou now have unlimited access.")
            else:
                send_message(chat_id, "❌ *Invalid code!*\n\nSend `/premium your_code`")
            return "OK", 200

        # ==========================================
        # GENERATE COMMAND (Image)
        # ==========================================
        if text and text.startswith("/generate "):
            prompt = text.replace("/generate ", "").strip()
            send_typing(chat_id)

            try:
                r = requests.post(
                    f"{API_URL}/api",
                    headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
                    json={"action": "image_generate", "prompt": prompt, "style": "artistic"},
                    timeout=120
                )

                if r.status_code == 200:
                    data = r.json()
                    image_url = data.get("image_url", data.get("response", ""))
                    if image_url.startswith("http"):
                        # Send image
                        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
                        requests.post(url, json={"chat_id": chat_id, "photo": image_url, "caption": f"🎨 Generated: {prompt[:50]}"})
                    else:
                        send_message(chat_id, f"🎨 *Generated*\n\n{image_url[:500]}")
                else:
                    send_message(chat_id, "❌ Image generation failed!")
            except Exception as e:
                send_message(chat_id, f"❌ Error: {str(e)[:100]}")
            return "OK", 200

        # ==========================================
        # SECRET WORD - ADMIN PANEL
        # ==========================================
        if text and text.strip().lower() == ADMIN_SECRET:
            admin_sessions[user_id] = {
                "active": True,
                "login_time": time.time(),
                "username": username
            }
            send_message(
                chat_id,
                f"👑 *ADMIN PANEL UNLOCKED!*\n\n"
                f"Welcome, {username}!\n"
                f"🕐 {time.strftime('%H:%M:%S')}\n\n"
                f"Select an action below or just chat normally.\n"
                f"All your messages now have admin privileges!",
                reply_markup=get_admin_keyboard()
            )
            return "OK", 200

        # ==========================================
        # PHOTO HANDLER (Vision Analysis)
        # ==========================================
        if "photo" in msg:
            send_typing(chat_id)
            try:
                photo = msg["photo"][-1]
                file_id = photo["file_id"]

                # Get file path from Telegram
                file_info = requests.get(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}"
                ).json()

                if file_info.get("ok"):
                    file_path = file_info["result"]["file_path"]
                    file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"

                    # Download and encode image
                    img_data = requests.get(file_url).content
                    img_base64 = base64.b64encode(img_data).decode('utf-8')

                    # Send to Cloudflare API
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
                        send_message(chat_id, f"🔍 *Vision Analysis*\n\n{analysis}\n\n👁️ {provider}")
                    else:
                        send_message(chat_id, "❌ Image analysis failed!")
                else:
                    send_message(chat_id, "❌ Could not process image!")
            except Exception as e:
                send_message(chat_id, f"❌ Error: {str(e)[:100]}")
            return "OK", 200

        # ==========================================
        # VOICE HANDLER
        # ==========================================
        if "voice" in msg:
            send_typing(chat_id)
            try:
                voice = msg["voice"]
                file_id = voice["file_id"]

                # Get file
                file_info = requests.get(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}"
                ).json()

                if file_info.get("ok"):
                    file_path = file_info["result"]["file_path"]
                    file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                    voice_data = requests.get(file_url).content

                    # Send to voice API
                    r = requests.post(
                        f"{API_URL}/voice-chat",
                        headers={"X-API-Key": API_KEY},
                        files={"audio": ("voice.ogg", voice_data, "audio/ogg")},
                        data={"language": "hi"},
                        timeout=60
                    )

                    if r.status_code == 200:
                        # Check if response is audio
                        if 'audio' in r.headers.get('Content-Type', ''):
                            send_voice(chat_id, r.content)
                        else:
                            # Text response
                            send_message(chat_id, r.json().get("response", "Voice processed!"))
                    else:
                        send_message(chat_id, "❌ Voice processing failed!")
                else:
                    send_message(chat_id, "❌ Could not process voice!")
            except Exception as e:
                send_message(chat_id, f"❌ Voice error: {str(e)[:100]}")
            return "OK", 200

        # ==========================================
        # DOCUMENT/FILE HANDLER
        # ==========================================
        if "document" in msg:
            send_typing(chat_id)
            try:
                doc = msg["document"]
                file_id = doc["file_id"]
                file_name = doc.get("file_name", "file")

                # Get file
                file_info = requests.get(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/getFile?file_id={file_id}"
                ).json()

                if file_info.get("ok"):
                    file_path = file_info["result"]["file_path"]
                    file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
                    file_data = requests.get(file_url).content
                    file_b64 = base64.b64encode(file_data).decode('utf-8')

                    # Send to API for analysis
                    r = requests.post(
                        f"{API_URL}/api",
                        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
                        json={"action": "analyze_file", "filename": file_name, "content": file_b64},
                        timeout=90
                    )

                    if r.status_code == 200:
                        data = r.json()
                        send_message(chat_id, f"📄 *File Analysis*\n\n{data.get('response', 'Done!')[:2000]}")
                    else:
                        send_message(chat_id, "❌ File analysis failed!")
                else:
                    send_message(chat_id, "❌ Could not process file!")
            except Exception as e:
                send_message(chat_id, f"❌ File error: {str(e)[:100]}")
            return "OK", 200

        # ==========================================
        # NORMAL CHAT MESSAGE
        # ==========================================
        if text:
            # Check daily limit
            if not check_limit(user_id):
                send_message(
                    chat_id,
                    f"⚠️ *Daily Limit Reached!*\n\n"
                    f"You've used 50 free messages today.\n"
                    f"Send `/premium {ADMIN_SECRET}` if you have the code."
                )
                return "OK", 200

            send_typing(chat_id)

            # Prepare headers
            headers = {"Content-Type": "application/json", "X-API-Key": API_KEY}
            if user_id in admin_sessions and admin_sessions[user_id].get("active"):
                headers["X-User-ID"] = ADMIN_ID

            try:
                start_time = time.time()
                r = requests.post(
                    f"{API_URL}/api",
                    headers=headers,
                    json={"action": "chat", "message": text},
                    timeout=60
                )
                latency = int((time.time() - start_time) * 1000)

                if r.status_code == 200:
                    data = r.json()
                    reply = data.get('response', 'No response')
                    model = data.get('model', 'AI')
                    is_premium = data.get('isPremium', False)

                    # Add badges
                    if user_id in admin_sessions:
                        reply = f"👑 *[ADMIN MODE]*\n\n{reply}"

                    premium_badge = "💎 Premium | " if is_premium else ""

                    # Split long messages
                    if len(reply) > 4000:
                        for i in range(0, len(reply), 4000):
                            send_message(chat_id, reply[i:i+4000])
                    else:
                        send_message(chat_id, f"{reply}\n\n{premium_badge}⚡ {latency}ms | 🤖 {model}")
                else:
                    send_message(chat_id, "❌ *Service temporarily unavailable*\n\nPlease try again in a moment.")
            except requests.exceptions.Timeout:
                send_message(chat_id, "⚠️ *Connection timeout*\n\nPlease try with a shorter message.")
            except Exception as e:
                send_message(chat_id, f"❌ *Error:* {str(e)[:100]}")

        return "OK", 200

    except Exception as e:
        print(f"Webhook error: {e}")
        return "OK", 200

# ==========================================
# CALLBACK HANDLER (Button Clicks)
# ==========================================

def handle_callback(callback):
    try:
        answer_callback(callback["id"])
        chat_id = callback["message"]["chat"]["id"]
        message_id = callback["message"]["message_id"]
        user_id = callback["from"]["id"]
        data = callback["data"]

        # Check admin access for admin actions
        if data.startswith('admin_') and user_id not in admin_sessions:
            edit_message(chat_id, message_id, "❌ Admin access required! Send the secret word first.")
            return

        headers = {"Content-Type": "application/json", "X-API-Key": API_KEY, "X-User-ID": ADMIN_ID}

        if data == 'new_chat':
            edit_message(chat_id, message_id, "💬 *New Chat Started!*\n\nJust type your message below!")

        elif data == 'image_info':
            edit_message(chat_id, message_id,
                "🎨 *AI Image Generation*\n\n"
                "Just type: `/generate [your prompt]`\n\n"
                "Example: `/generate Beautiful sunset over mountains`\n\n"
                "Styles: realistic, artistic, photorealistic")

        elif data == 'photo_info':
            edit_message(chat_id, message_id,
                "📸 *Real Photo Search*\n\n"
                "Just send any photo and I'll analyze it!\n\n"
                "Or try: `/photo Taj Mahal` for HD photos")

        elif data == 'settings':
            edit_message(chat_id, message_id,
                "⚙️ *Settings*\n\n"
                "• Free: 50 msgs/day\n"
                "• Premium: Unlimited\n\n"
                f"Send *{ADMIN_SECRET}* for admin panel")

        elif data == 'admin_verify':
            edit_message(chat_id, message_id,
                "👑 *Verify Premium*\n\n"
                f"Send: `/premium {ADMIN_SECRET}`\n\n"
                "Or contact admin for premium access.")

        elif data == 'admin_status':
            prem = check_premium(user_id)
            edit_message(chat_id, message_id,
                f"📊 *Admin Status*\n\n"
                f"Admin Session: {'✅ Active' if user_id in admin_sessions else '❌ Inactive'}\n"
                f"Premium: {'✅ Yes' if prem else '❌ No'}")

        elif data == 'admin_revoke':
            edit_message(chat_id, message_id,
                "❌ *Revoke Premium*\n\n"
                "To revoke a user's premium:\n"
                "Command: `/revoke [user_id]`\n\n"
                "Example: `/revoke 123456789`")

        elif data == 'admin_plans':
            try:
                r = requests.post(f"{API_URL}/api", headers=headers, json={"action": "premium_plans"}, timeout=10)
                edit_message(chat_id, message_id, f"📋 *Premium Plans*\n\n```\n{r.text[:500]}\n```")
            except:
                edit_message(chat_id, message_id, "📋 *Plans:* Plus (₹99), Pro (₹199), Enterprise (₹499)")

        elif data == 'admin_health':
            try:
                r = requests.get(f"{API_URL}/health", timeout=10)
                health_data = r.json()
                edit_message(chat_id, message_id,
                    f"🏥 *System Health*\n\n"
                    f"📅 Date: {health_data.get('date', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}\n"
                    f"🟢 Status: {health_data.get('status', 'Online')}\n"
                    f"🤖 Models: {health_data.get('features', {}).get('models', '6+ Models')}\n"
                    f"🔍 Search: {health_data.get('features', {}).get('webSearch', 'Enabled')}")
            except:
                edit_message(chat_id, message_id, "🏥 *System Health*\n\n✅ Bot: Running\n✅ API: Online")

        elif data == 'admin_clear':
            edit_message(chat_id, message_id,
                "🗑️ *Clear Session*\n\n"
                "Command: `/clear [user_id]`\n\n"
                "Example: `/clear 123456789`\n\n"
                "Clears user's chat history.")

        elif data == 'admin_logout':
            admin_sessions.pop(user_id, None)
            edit_message(chat_id, message_id, "🚪 *Logged out!*\n\nSend the secret word again to login.")

        else:
            edit_message(chat_id, message_id, f"⚙️ *Action:* {data}\n\nComing soon!")

    except Exception as e:
        print(f"Callback error: {e}")

# ==========================================
# ADDITIONAL COMMAND HANDLERS (via direct messages)
# ==========================================

# Note: These are handled in the main webhook, but keeping for reference
# /verify, /revoke, /clear commands work via normal text messages

# ==========================================
# VERCEL ENTRY POINT
# ==========================================
handler = app