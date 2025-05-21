from dotenv import load_dotenv
from openai import OpenAI
import json
import os
import requests
from pypdf import PdfReader
# --- Add Flask imports ---
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import io
import tempfile


load_dotenv(override=True)


class Me:

    def __init__(self):
        # self.openai = OpenAI()
        self.gemini = OpenAI(api_key= os.getenv("GOOGLE_API_KEY"), base_url="https://generativelanguage.googleapis.com/v1beta/openai/")

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
If the user is engaging in discussion, try to steer them towards getting in touch via email; ask for them to contact over email or linkedin. "

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

# --- New: Voice endpoints ---
@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    audio_file = request.files['audio']
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=True, suffix='.wav') as tmp:
        audio_file.save(tmp.name)
        tmp.seek(0)
        # Use OpenAI Whisper API via SDK
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        transcript = openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=tmp,
            response_format="text"
        )
    return jsonify({'transcript': transcript})

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text')
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    # Use OpenAI TTS API via SDK
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    speech = openai_client.audio.speech.create(
        model="tts-1",
        voice="alloy",
        input=text,
        response_format="mp3"
    )
    # speech.content is bytes
    return send_file(
        io.BytesIO(speech.content),
        mimetype='audio/mpeg',
        as_attachment=False,
        download_name='speech.mp3'
    )

if __name__ == "__main__":
    # Uncomment one of the following lines depending on which interface you want to run:
    # 1. For Gradio (default UI):
    # me = Me()
    # gr.ChatInterface(me.chat, type="messages").launch()

    # 2. For Flask API (custom HTML/JS frontend):
    app.run(port=5000)
    