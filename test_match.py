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

# ================= HELPERS =================
def safe_int(val, default=0):
    try:
        return int(float(val)) if val else default
    except:
        return default

# ================= MATCH FUNCTION =================
def match_schemes(user_profile):
    user_age = user_profile.get("age", 0)
    user_income = user_profile.get("income", 0)
    user_gender = user_profile.get("gender", "").lower()
    user_state = user_profile.get("state", "").lower()
    user_category = user_profile.get("category", "").lower()

    matches = []

    # ⚠️ Consider limiting in future
    schemes_ref = db.collection('schemes').stream()

    for doc in schemes_ref:
        s = doc.to_dict()
        missed_criteria = []

        # 🔹 State check
        scheme_state = (s.get('state') or '').lower()
        if s.get('level') == 'state' and scheme_state and user_state and scheme_state != user_state:
            missed_criteria.append("state")

        # 🔹 Age check
        min_age = safe_int(s.get('age_min'), 0)
        max_age = safe_int(s.get('age_max'), 150)

        if user_age < min_age:
            missed_criteria.append("age_low")
        elif user_age > max_age:
            missed_criteria.append("age_high")

        # 🔹 Income check
        income_limit = safe_int(s.get('income_limit_annual'), 999999999)
        if user_income > income_limit:
            missed_criteria.append("income")

        # 🔹 Gender check
        s_gender = (s.get('gender') or 'all').lower()
        if s_gender != 'all' and user_gender and s_gender != user_gender:
            missed_criteria.append("gender")

        # 🔥 Matching logic
        if len(missed_criteria) <= 1:
            matches.append({
                "scheme_name": s.get('name'),
                "missed": missed_criteria
            })

    return matches


# ================= TEST =================
if __name__ == "__main__":
    user_profile = {
        "age": 19,
        "income": 200000,
        "gender": "male",
        "state": "gujarat",
        "category": "general"
    }

    results = match_schemes(user_profile)

    print(f"\n✅ Matches Found: {len(results)}\n")

    for r in results[:10]:
        print(r)