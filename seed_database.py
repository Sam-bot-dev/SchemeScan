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

    firebase_admin.initialize_app(cred, {
        'projectId': cred_dict.get("project_id")
    })

db = firestore.client()

# ================= SEED FUNCTION =================
def seed_database():
    print("🚀 Starting database seed...")

    # 🔹 USERS
    user_id = 'test_citizen_123'
    db.collection('users').document(user_id).set({
        'uid': user_id,
        'display_name': 'Ram Kumar',
        'preferred_language': 'hi',
        'state': 'Uttar Pradesh',
        'role': 'citizen',
        'created_at': firestore.SERVER_TIMESTAMP,
        'profile': {   # ✅ store as object (better)
            "annual_income": 45000,
            "category": "OBC",
            "occupation": "Farmer"
        }
    })

    # 🔹 ADMIN_USERS
    admin_id = 'test_admin_999'
    db.collection('admin_users').document(admin_id).set({
        'uid': admin_id,
        'email': 'admin@sarkari.in',
        'name': 'System Administrator',
        'access_level': 'superadmin',
        'last_login': firestore.SERVER_TIMESTAMP
    })

    # 🔹 SCHEMES
    scheme_id = 'scheme_pm_kisan'
    db.collection('schemes').document(scheme_id).set({
        'scheme_id': scheme_id,
        'name': 'PM-KISAN Samman Nidhi',
        'ministry': 'Ministry of Agriculture',
        'level': 'central',
        'state': '',
        'category': 'agriculture',
        'pdf_url': 'https://schemes.gov.in/pmkisan.pdf',
        'last_updated': firestore.SERVER_TIMESTAMP,
        'chunk_count': 24
    })

    # 🔹 QUERIES
    query_id = 'query_001'
    db.collection('queries').document(query_id).set({
        'query_id': query_id,
        'user_uid': user_id,
        'raw_input': 'Mujhe kheti ke liye scheme batao',
        'detected_language': 'hi',
        'translated_input': 'Tell me schemes for farming',
        'extracted_profile': {   # ✅ object instead of string
            "occupation": "farmer"
        },
        'created_at': firestore.SERVER_TIMESTAMP,
        'state_filter': 'Uttar Pradesh',
        'category': 'agriculture'
    })

    # 🔹 USER_DOCUMENTS
    doc_id = 'doc_001'
    db.collection('user_documents').document(doc_id).set({
        'doc_id': doc_id,
        'user_uid': user_id,
        'doc_type': 'aadhaar',
        'storage_path': f'documents/{user_id}/aadhaar/sample.pdf',
        'extracted_fields': {   # ✅ object
            'name': 'Ram Kumar',
            'dob': '12/05/1980'
        },
        'uploaded_at': firestore.SERVER_TIMESTAMP,
        'verified': True
    })

    # 🔹 SCHEME_MATCHES
    match_id = 'match_001'
    db.collection('scheme_matches').document(match_id).set({
        'match_id': match_id,
        'query_id': query_id,
        'scheme_id': scheme_id,
        'eligible': True,
        'reasoning': [   # ✅ object list
            {'criterion': 'Farmer', 'met': True}
        ],
        'citations': [
            {'text': 'Available to all landholding farmers'}
        ],
        'checklist': [
            {'step': 1, 'description': 'Submit Aadhaar'}
        ],
        'has_conflict': False,
        'created_at': firestore.SERVER_TIMESTAMP
    })

    # 🔹 SAVED_SCHEMES
    db.collection('saved_schemes').document('save_001').set({
        'save_id': 'save_001',
        'user_uid': user_id,
        'scheme_id': scheme_id,
        'saved_at': firestore.SERVER_TIMESTAMP,
        'notes': 'Need to find my land records first'
    })

    # 🔹 SCHEME_CONFLICTS
    db.collection('scheme_conflicts').document('conflict_001').set({
        'conflict_id': 'conflict_001',
        'scheme_id': scheme_id,
        'central_clause': 'Income limit is 2 Lakhs',
        'state_clause': 'Income limit is 1.5 Lakhs (State specific)',
        'explanation': 'State scheme has stricter criteria',
        'central_pdf_ref': 'PM-KISAN Page 4',
        'state_pdf_ref': 'UP-KISAN Page 2'
    })

    # 🔹 ADMIN_LOGS
    db.collection('admin_logs').document('log_001').set({
        'log_id': 'log_001',
        'admin_uid': admin_id,
        'action': 'SYSTEM_INIT',
        'target_id': 'all',
        'timestamp': firestore.SERVER_TIMESTAMP,
        'ip_address': '127.0.0.1'
    })

    print("\n✅ Database seeding complete!")

# ================= RUN =================
if __name__ == '__main__':
    seed_database()