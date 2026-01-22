import os
import time
import requests
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer, util
from dotenv import load_dotenv

load_dotenv(override=True)

# configuration
API_KEY = os.getenv("API_KEY")
BASE_URL = os.getenv("BASE_URL")

if not API_KEY:
    print(f"[FATAL] API_KEY not found. Ensure it's set in Github Secrets")
    exit(1)

HEADERS = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

def fetch_all_data(endpoint: str, limit: int = 100) -> pd.DataFrame:

    all_data = []
    cursor = None
    page_count = 0
    print(f"[INFO] Fetching data from {endpoint}...")

    while True:
        params = {"limit": limit}
        if cursor:
            params["cursor"] = cursor

        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS, params=params)
            if response.status_code != 200:
                print(f"[ERROR] Failed to fetch data: {response.status_code} - {response.text}")
                break

            data = response.json()
            items = data.get("data", [])

            if not items:
                print("[INFO] No more data to fetch.")
                break

            all_data.extend(items)
            cursor = data.get("next_cursor")
            page_count += 1
            print(f" -> Page {page_count} fetched ({len(items)} items)")

            if not cursor:
                print("[INFO] Reached the end of data.")
                break
            time.sleep(0.2)

        except Exception as e:
            print(f"[ERROR] Exception fetching {endpoint}: {e}")
            break
    
    print(f"[INFO] Fetched {len(all_data)} items from {endpoint} in {page_count} pages.")
    return pd.DataFrame(all_data)


def calculate_skill_overlap(user_skills: list, job_skills: list) -> tuple[int, float]:
    """
    Returns (overlap_count, jaccard_score)
    """
    if not user_skills or not job_skills:
        print("[WARN] One of the skill lists is empty.")
        return 0, 0.0
    
    u_set = {s['name'].lower().strip() if isinstance(s, dict) else str(s).lower().strip() for s in user_skills}
    j_set = {s.lower().strip() if isinstance(s, str) else str(s["name"]).lower().strip() for s in job_skills}

    intersection = u_set.intersection(j_set)
    union = u_set.union(j_set)

    if len(union) == 0:
        print("[WARN] Union of skill sets is empty.")
        return 0, 0.0
    return len(intersection), len(intersection) / len(union)

def run_engine():

    print("[INFO] Initializing Sentence Transformer model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # fetch data
    df_users = fetch_all_data("/ai/data/users")
    df_jobs = fetch_all_data("/ai/data/jobs")
    df_swipes = fetch_all_data("/ai/data/swipes")

    if df_users.empty or df_jobs.empty:
        print("[ERROR] Users or Jobs data is empty. Exiting.")
        return
    
    # pre-processing
    df_users["intent_text"] = df_users["intent_text"].fillna("").astype(str)
    df_jobs["problem_statement"] = df_jobs["problem_statement"].fillna("").astype(str)

    # already swiped map
    user_swiped_map = {}
    if not df_swipes.empty:
        for user_id, group in df_swipes.groupby("user_id"):
            user_swiped_map[user_id] = set(group["job_id"].values)

    # bulk encoding jobs
    print("[INFO] Encoding job problem statements...")
    job_embeddings = model.encode(df_jobs["problem_statement"].tolist(), convert_to_tensor=True)

    updates_sent = 0

    print("[INFO] Processing users for job recommendations...")
    for index, user in df_users.iterrows():
        user_id = user["user_id"]
        user_intent = user["intent_text"]
        user_constraints = user.get("constraints", {})

        if not user_intent.strip():
            print(f"[WARN] User {user_id} has empty intent text. Skipping.")
            continue

        # encode user
        user_emb = model.encode(user_intent, convert_to_tensor=True)

        # calculate sematic scores
        cosine_scores = util.cos_sim(user_emb, job_embeddings)[0]

        candidates = []
        seen_jobs = user_swiped_map.get(user_id, set())

        for idx, score in enumerate(cosine_scores):
            job = df_jobs.iloc[idx]
            job_id = job["job_id"]
            job_constraints = job.get("constraints", {})

            if job_id in seen_jobs:
                continue

            # skill check
            overlap_count, skill_score = calculate_skill_overlap(user.get("skills", []), job.get("skills_required", []))
            if overlap_count == 0:
                continue

            # location check
            if not user_constraints.get("remote_only", False):
                user_locs = [l.lower() for l in user_constraints.get("preferred_locations", [])]
                job_loc = job_constraints.get("location", "").lower()
                if job_loc and job_loc not in user_locs:
                    continue

            
            # salary check
            user_salary = user_constraints.get("preferred_salary", 0)
            job_salary_range = job_constraints.get("salary_range", [0, 0])
            if isinstance(job_salary_range, list) and len(job_salary_range) == 2:
                if user_salary > job_salary_range[1]: continue
            
            # scoring
            final_score = (0.6 * score.item()) + (0.4 * skill_score)

            candidates.append({
                "job_id": job_id,
                "score": final_score,
                "reasons": {
                    "semantic": round(score.item(), 2),
                    "skills": overlap_count
                }
            })

        # sort and select top 5
        candidates.sort(key=lambda x: x["score"], reverse=True)
        top_matches = candidates[:5]

        if top_matches:

            payload = {
                "user_id": user_id,
                "positive_signals": {
                    "predicted_match_score": top_matches[0]["score"],
                    "affinity_clusters": []
                },
                "supression_rules": {
                    "cooldown_job_ids": [m["job_id"] for m in top_matches]
                }
            }

            try:
                response = requests.post(f"{BASE_URL}/ai/recommendations/update", headers=HEADERS, json=payload)
                if response.status_code == 200:
                    updates_sent += 1
                    print(f"[INFO] Updated recommendations for user {user_id} with {len(top_matches)} jobs.")
                else:
                    print(f"[ERROR] Failed to update recommendations for user {user_id}: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"[ERROR] API Post Error: {e}")

            # Detailed Console Output, for checking if you satisfied with matches then remove this block and uncommet above-----start
            print(f"\n📊 Displaying Analysis for User: {user_id}")
            print("="*80)

            # Get User Details (Optimized: 'user' variable already holds the row data)
            u_skills = [s['name'] for s in user['skills']]
            u_loc = user_constraints.get('preferred_locations')
            u_sal = user_constraints.get('preferred_salary')
            # Truncate intent for clean view
            u_intent = str(user_intent)[:100] + "..." 
            
            print(f"👤 USER: {user_id}")
            print(f"   📝 Intent:   {u_intent}")
            print(f"   🛠️ Skills:   {u_skills}")
            print(f"   📍 Prefs:    {u_loc} (Remote Only: {user_constraints.get('remote_only')})")
            print(f"   💰 Ask:      ${u_sal}")
            print("-" * 80)
            
            # Get Recommended Jobs Details
            for i, match in enumerate(top_matches): 
                job_id = match['job_id']
                score = match['score']
                reasons = match.get('reasons', {})
                
                # Fetch Job Details from DataFrame
                job_row = df_jobs[df_jobs['job_id'] == job_id].iloc[0]
                j_skills = job_row['skills_required']
                j_loc = job_row['constraints'].get('location')
                j_sal = job_row['constraints'].get('salary_range')
                j_problem = str(job_row.get('problem_statement', ''))[:100] + "..."
                
                print(f"   ✅ MATCH #{i+1} (Score: {score:.2f})")
                print(f"      🏢 Problem:  {j_problem}")
                print(f"      🛠️ Needs:    {j_skills}")
                print(f"      📍 Loc:      {j_loc}")
                print(f"      💰 Pays:     {j_sal}") # Adjusted for safe printing
                print(f"      🧠 Why:      Semantic={reasons.get('semantic')}, Skills={reasons.get('skills')}")
                print("")
                
            print("="*80)
            print("\n")
            # Detailed Console Output, for checking if you satisfied with matches then remove this block and uncommet above-----end
        
    print(f"[INFO] Engine Cycle Complete. Updated profiles for {updates_sent} users.")

if __name__ == "__main__":
    run_engine()   