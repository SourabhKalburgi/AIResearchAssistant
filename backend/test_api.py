import requests
import os
from dotenv import load_dotenv

load_dotenv()
HF_API_KEY = os.getenv("HF_API_KEY")

API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

payload = {"inputs": "Hugging Face is an open-source AI company focused on NLP and ML."}
response = requests.post(API_URL, headers=HEADERS, json=payload)

print(response.status_code)  # Should be 200 if everything works
print(response.json())  # Should return summary
