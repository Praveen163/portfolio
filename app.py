from dotenv import load_dotenv
from openai import OpenAI
from pypdf import PdfReader
# --- Add Flask imports ---
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os

load_dotenv(override=True)


class Me:

    def __init__(self):
        # self.openai = OpenAI()
        self.gemini = OpenAI(api_key= os.getenv("GEMINI_API_KEY") , base_url="https://generativelanguage.googleapis.com/v1beta/openai/")

        self.name = "Praveen Kumar"
        reader = PdfReader("me/linkedin.pdf")
        self.linkedin = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                self.linkedin += text
        with open("me/summary.txt", "r", encoding="utf-8") as f:
            self.summary = f.read()


    
    def system_prompt(self):
        system_prompt = f"You are acting as {self.name}. You are answering questions on {self.name}'s website, \
particularly questions related to {self.name}'s career, background, skills and experience. \
Your responsibility is to represent {self.name} for interactions on the website as faithfully as possible. \
You are given a summary of {self.name}'s background and two resume profile which you can use to answer questions. \
Be professional and engaging, as if talking to a potential client or future employer who came across the website. \
If the user is engaging in discussion, try to steer them towards getting in touch via email; ask for them to contact over email or linkedin . "

        system_prompt += f"\n\n## Summary:\n{self.summary}\n\n## LinkedIn Profile:\n{self.linkedin}\n\n"
        system_prompt += f"With this context, please chat with the user, always staying in character as {self.name}."
        return system_prompt
    
    def chat(self, message, history):
        messages = [{"role": "system", "content": self.system_prompt()}] + history + [{"role": "user", "content": message}]
        response = self.gemini.chat.completions.create(model="gemini-2.0-flash", messages=messages)
        return response.choices[0].message.content
    

# --- Flask API for custom frontend ---
app = Flask(__name__)
CORS(app)
me = Me()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    history = data.get('history', [])
    response = me.chat(message, history)
    return jsonify({'response': response})


@app.route('/')
def index():
    return jsonify({'response': 'working'})

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 10000))  # Default to 10000 as per Render docs
    app.run(host="0.0.0.0", port=port)
