import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# ================= FIREBASE INIT =================
def init_firestore():
    if not firebase_admin._apps:
        firebase_json = os.environ.get("FIREBASE_CREDENTIALS")

        if not firebase_json:
            raise ValueError("❌ FIREBASE_CREDENTIALS not set")

        try:
            cred_dict = json.loads(firebase_json)
        except json.JSONDecodeError:
            raise ValueError("❌ Invalid FIREBASE_CREDENTIALS JSON")

        cred = credentials.Certificate(cred_dict)

        firebase_admin.initialize_app(cred, {
            "projectId": cred_dict.get("project_id")
        })

    return firestore.client()


# 🔹 Initialize DB
db = init_firestore()


# ================= TEST FUNCTION =================
def add_sample_data():
    doc_ref = db.collection("test_collection").document("test_doc")
    doc_ref.set({
        "name": "Bhavesh",
        "project": "Sarkari Saathi",
        "status": "working"
    })
    print("✅ Data added successfully!")


# ================= RUN =================
if __name__ == "__main__":
    add_sample_data()