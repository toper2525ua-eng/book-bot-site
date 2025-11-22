import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Replace with your actual token
TOKEN = '8325924267:AAEd1hfu-Jk4OtyR4hQxG0iZjG-k59O-3kg'
bot = telebot.TeleBot(TOKEN)

# IMPORTANT: This URL must be HTTPS. 
# Since we are running locally, we can't use 'http://localhost:8000' directly in Telegram.
# For now, I'll use a placeholder. We will update this after deploying to GitHub Pages.
WEB_APP_URL = "https://toper2525ua-eng.github.io/book-bot-site/" 

@bot.message_handler(commands=['start'])
def send_welcome(message):
    markup = InlineKeyboardMarkup()
    # Create a Web App button
    web_app = WebAppInfo(url=WEB_APP_URL)
    btn = InlineKeyboardButton("Відкрити Книжкового Бота 📖", web_app=web_app)
    markup.add(btn)
    
    bot.reply_to(message, "Привіт! Натисни кнопку нижче, щоб почати створювати книги за допомогою AI.", reply_markup=markup)

if __name__ == "__main__":
    print("Bot is running...")
    try:
        bot.infinity_polling()
    except Exception as e:
        print(f"Error: {e}")
