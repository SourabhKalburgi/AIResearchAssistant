from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import PyPDF2
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

HF_API_KEY = os.getenv("HF_API_KEY")
SUMMARIZATION_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
QA_API_URL = "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2"
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

# Store extracted text temporarily
extracted_text_storage = {}

@app.route('/')
def home():
    return jsonify({"message": "AI Research Assistant Backend is running!"})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        extracted_text = extract_text_from_pdf(filepath)
        summary = summarize_text(extracted_text)

        # Store extracted text for future questions
        extracted_text_storage[filepath] = extracted_text

        return jsonify({
            "message": "File uploaded successfully",
            "filepath": filepath,
            "summary": summary
        }), 200

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text = ""
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        return f"Error extracting text: {str(e)}"
    return text

def summarize_text(text):
    """Summarizes text using Hugging Face API."""
    payload = {"inputs": text, "parameters": {"max_length": 250, "min_length": 50, "do_sample": False}}
    response = requests.post(SUMMARIZATION_API_URL, headers=HEADERS, json=payload)
    if response.status_code == 200:
        return response.json()[0]['summary_text']
    return "Error: " + response.text

@app.route('/ask', methods=['POST'])
def ask_question():
    """Answers a follow-up question based on extracted text."""
    data = request.json
    question = data.get("question")
    filepath = data.get("filepath")

    if not question or not filepath or filepath not in extracted_text_storage:
        return jsonify({"error": "Invalid request or file not found"}), 400

    context = extracted_text_storage[filepath]
    answer = get_answer_from_context(question, context)

    return jsonify({"answer": answer}), 200

def get_answer_from_context(question, context):
    """Uses Hugging Face model to answer questions from context."""
    payload = {"inputs": {"question": question, "context": context}}
    response = requests.post(QA_API_URL, headers=HEADERS, json=payload)
    if response.status_code == 200:
        return response.json()['answer']
    return "Error: " + response.text

@app.route('/delete', methods=['POST'])
def delete_file():
    data = request.json
    filepath = data.get("filepath")
    
    if not filepath:
        return jsonify({"error": "No filepath provided"}), 400
    
    if os.path.exists(filepath):
        os.remove(filepath)
        extracted_text_storage.pop(filepath, None)  # Remove stored text
        return jsonify({"message": "File deleted successfully"}), 200
    else:
        return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
