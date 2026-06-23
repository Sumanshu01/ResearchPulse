from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import numpy as np
from scipy.spatial.distance import cosine
import traceback

app = Flask(__name__)

print("Loading sentence-transformer model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded successfully!")

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "ResearchPulse Embedding Service",
        "model": "all-MiniLM-L6-v2",
        "dimension": 384,
        "status": "online"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "all-MiniLM-L6-v2"})

@app.route('/embed', methods=['POST'])
def embed():
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "text is required"}), 400
        if not isinstance(text, str):
            return jsonify({"error": "text must be a string"}), 400
        
        embedding = model.encode(text, normalize_embeddings=True).tolist()
        return jsonify({"embedding": embedding, "dimension": len(embedding)})
    except Exception as e:
        print(f"Error in /embed: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to generate embedding", "details": str(e)}), 500

@app.route('/embed-batch', methods=['POST'])
def embed_batch():
    try:
        data = request.get_json() or {}
        texts = data.get('texts', [])
        if not texts:
            return jsonify({"error": "texts array is required"}), 400
        if not isinstance(texts, list):
            return jsonify({"error": "texts must be a list of strings"}), 400
        if not all(isinstance(t, str) for t in texts):
            return jsonify({"error": "all items in texts must be strings"}), 400
            
        embeddings = model.encode(texts, normalize_embeddings=True, batch_size=32).tolist()
        return jsonify({"embeddings": embeddings, "count": len(embeddings)})
    except Exception as e:
        print(f"Error in /embed-batch: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to generate batch embeddings", "details": str(e)}), 500

@app.route('/similarity', methods=['POST'])
def similarity():
    try:
        data = request.get_json() or {}
        text1 = data.get('text1', '')
        text2 = data.get('text2', '')
        if not text1 or not text2:
            return jsonify({"error": "text1 and text2 required"}), 400
        if not isinstance(text1, str) or not isinstance(text2, str):
            return jsonify({"error": "text1 and text2 must be strings"}), 400
            
        emb1 = model.encode(text1, normalize_embeddings=True)
        emb2 = model.encode(text2, normalize_embeddings=True)
        score = float(1 - cosine(emb1, emb2))
        return jsonify({"similarity": score})
    except Exception as e:
        print(f"Error in /similarity: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": "Failed to calculate similarity", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
