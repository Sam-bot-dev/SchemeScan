import os
import json
import csv
import firebase_admin
from firebase_admin import credentials, firestore

# 🔹 Initialize Firebase only once
if not firebase_admin._apps:
    # Load credentials from environment variable
    firebase_json = os.environ.get("FIREBASE_CREDENTIALS")

    if not firebase_json:
        raise ValueError("FIREBASE_CREDENTIALS not set in environment variables")

    cred_dict = json.loads(firebase_json)
    cred = credentials.Certificate(cred_dict)

    firebase_admin.initialize_app(cred)

# 🔹 Firestore client
db = firestore.client()


# ✅ Example function (test Firestore)
def add_sample_data():
    doc_ref = db.collection("test_collection").document("test_doc")
    doc_ref.set({
        "name": "Bhavesh",
        "project": "Sarkari Saathi",
        "status": "working"
    })
    print("✅ Data added successfully!")


if __name__ == "__main__":
    add_sample_data()