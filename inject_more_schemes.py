import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# ================= FIREBASE INIT =================
if not firebase_admin._apps:
    firebase_json = os.environ.get("FIREBASE_CREDENTIALS")
    if not firebase_json:
        raise ValueError("FIREBASE_CREDENTIALS not set")

    cred_dict = json.loads(firebase_json)
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# ================= CHROMA INIT =================
from chromadb.utils import embedding_functions
import chromadb

sentence_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# ⚠️ Use /tmp for Render
chroma_client = chromadb.PersistentClient(path="/tmp/chroma_store")

collection = chroma_client.get_or_create_collection(
    name="government_schemes",
    embedding_function=sentence_ef
)

# ================= DATA =================
new_schemes = [
    {
        "id": "scheme_ayushman",
        "name": "Ayushman Bharat PM-JAY",
        "ministry": "Ministry of Health",
        "category": "health",
        "level": "central",
        "state": "",
        "desc": "Health insurance cover of Rs. 5 lakhs per family per year..."
    },
    {
        "id": "scheme_pmay",
        "name": "Pradhan Mantri Awas Yojana (PMAY)",
        "ministry": "Ministry of Housing",
        "category": "housing",
        "level": "central",
        "state": "",
        "desc": "Affordable housing scheme for urban and rural poor..."
    },
    {
        "id": "scheme_mgnrega",
        "name": "MGNREGA",
        "ministry": "Ministry of Rural Development",
        "category": "employment",
        "level": "central",
        "state": "",
        "desc": "Guarantees 100 days of wage employment..."
    },
    {
        "id": "scheme_cm_kisan_guj",
        "name": "CM Kisan Sahay Yojana",
        "ministry": "Dept. of Agriculture Gujarat",
        "category": "agriculture",
        "level": "state",
        "state": "Gujarat",
        "desc": "Crop insurance cover with zero premium..."
    }
]

# ================= FUNCTION =================
def inject_schemes():
    print("🚀 Injecting schemes...")

    for s in new_schemes:

        # 🔹 Firestore (skip if exists)
        doc_ref = db.collection('schemes').document(s['id'])
        if doc_ref.get().exists:
            print(f"⚠️ Skipping existing: {s['id']}")
        else:
            doc_ref.set({
                'scheme_id': s['id'],
                'name': s['name'],
                'ministry': s['ministry'],
                'category': s['category'],
                'level': s['level'],
                'state': s['state'],
                'chunk_count': 1,
                'pdf_url': f"https://schemes.gov.in/{s['id']}.pdf",
                'last_updated': firestore.SERVER_TIMESTAMP
            })

        # 🔹 Chroma
        chunk_id = f"{s['id']}_chunk_1"

        collection.upsert(
            documents=[s['desc']],
            metadatas=[{
                'scheme_id': s['id'],
                'scheme_name': s['name'],
                'category': s['category'],
                'level': s['level'],
                'state': s['state']
            }],
            ids=[chunk_id]
        )

    print("✅ Injection complete!")


# ================= RUN =================
if __name__ == "__main__":
    inject_schemes()