# SABER AI API Documentation

> **Hello BhAAi** 👋  
> This is your stable, final contract for AI integration.

## Authentication

All AI endpoints require:

```
X-API-KEY: <AI_INTERNAL_API_KEY>
```

**Security:**
- This key is stored in environment variables
- Never exposed to frontend
- Used only for internal AI system communication

---

## Global Rules

All AI endpoints:

- ✅ Require `X-API-KEY` header
- ✅ Are read-heavy (except `/recommendations/update`)
- ✅ Return identity-hidden, bias-safe data
- ✅ Support pagination and time filtering
- ❌ Never receive PII (names, emails, colleges, etc.)
- ❌ Cannot create matches or modify swipes
- ❌ Cannot override user constraints

---

## 1. `GET /ai/data/users`

**Purpose**  
User intent, constraints, and derived signals for preference modeling.

**Query Parameters**

- `since` - ISO_TIMESTAMP (optional)
- `until` - ISO_TIMESTAMP (optional)
- `limit` - number (default: 100, max: 1000)
- `cursor` - opaque_cursor (for pagination)

**Request Example**

```bash
GET /api/ai/data/users?since=2026-01-01T00:00:00Z&limit=100
X-API-KEY: your_ai_internal_api_key
```

**Response**

```json
{
  "data": [
    {
      "user_id": "uuid",
      "role": "candidate",
      "intent_text": "string",
      "why_text": "string",
      "constraints": {
        "availability": "full-time | part-time | contract",
        "work_mode": "remote | hybrid | onsite",
        "compensation_band": "string",
        "location": "string",
        "risk_tolerance": "startup | mid | stable"
      },
      "skills": [
        {
          "name": "TypeScript",
          "source": "github | linkedin",
          "confidence_score": 0.82
        }
      ],
      "created_at": "ISO_TIMESTAMP",
      "updated_at": "ISO_TIMESTAMP"
    }
  ],
  "next_cursor": "opaque_cursor",
  "has_more": true
}
```

**What You Get:**
- User intent and motivation
- Hard constraints (never override these)
- Evidence-based skills with confidence scores
- Temporal data for incremental learning

**What You Don't Get:**
- Names
- Emails
- Colleges
- Past employers
- Resumes

---

## 2. `GET /ai/data/jobs`

**Purpose**  
Problem statements and job-side constraints for relevance modeling.

**Query Parameters**

- `since` - ISO_TIMESTAMP (optional)
- `until` - ISO_TIMESTAMP (optional)
- `limit` - number (default: 100, max: 1000)
- `cursor` - opaque_cursor

**Response**

```json
{
  "data": [
    {
      "job_id": "uuid",
      "company_id": "uuid",
      "problem_statement": "string",
      "expectations": "string",
      "non_negotiables": "string",
      "deal_breakers": "string",
      "skills_required": ["React", "PostgreSQL"],
      "constraints": {
        "work_mode": "remote",
        "compensation_band": "string",
        "location": "string"
      },
      "active": true,
      "created_at": "ISO_TIMESTAMP"
    }
  ],
  "next_cursor": "opaque_cursor",
  "has_more": true
}
```

**What You Get:**
- Problem-first job descriptions
- Required skills
- Hard constraints
- Active status

**What You Don't Get:**
- Company names (pre-match)
- Recruiter identity
- Specific salary numbers

---

## 3. `GET /ai/data/swipes`

**Purpose**  
Primary behavioral signal for preference learning.

**Query Parameters**

- `since` - ISO_TIMESTAMP (optional)
- `until` - ISO_TIMESTAMP (optional)
- `user_id` - uuid (optional, filter by user)
- `limit` - number (default: 100, max: 1000)
- `cursor` - opaque_cursor

**Response**

```json
{
  "data": [
    {
      "swipe_id": "uuid",
      "user_id": "uuid",
      "job_id": "uuid",
      "direction": "left | right",
      "created_at": "ISO_TIMESTAMP"
    }
  ],
  "next_cursor": "opaque_cursor",
  "has_more": true
}
```

**Why This Matters:**
- **Right swipes** = positive preference signal
- **Left swipes** = negative preference signal
- This is your **ground truth** for learning user preferences
- More reliable than stated preferences

---

## 4. `GET /ai/data/matches`

**Purpose**  
Ground truth for positive outcomes.

**Query Parameters**

- `since` - ISO_TIMESTAMP (optional)
- `until` - ISO_TIMESTAMP (optional)
- `limit` - number (default: 100, max: 1000)
- `cursor` - opaque_cursor

**Response**

```json
{
  "data": [
    {
      "match_id": "uuid",
      "candidate_id": "uuid",
      "job_id": "uuid",
      "explainability_json": {
        "skill_overlap": ["React", "Node.js"],
        "constraint_alignment": true,
        "intent_similarity": "high | medium | low"
      },
      "reveal_status": false,
      "created_at": "ISO_TIMESTAMP"
    }
  ],
  "next_cursor": "opaque_cursor",
  "has_more": true
}
```

**Why This Matters:**
- Matches are the **ultimate success metric**
- Use this to validate your recommendation quality
- Learn what leads to successful matches

---

## 5. `GET /ai/data/recommendation-profiles`

**Purpose**  
Fetch current AI-generated state for incremental learning.

**Query Parameters**

- `user_id` - uuid (optional, filter by user)
- `limit` - number (default: 100, max: 1000)
- `cursor` - opaque_cursor

**Response**

```json
{
  "data": [
    {
      "user_id": "uuid",
      "positive_signals_json": {
        "preferred_problem_types": ["backend", "platform"],
        "preferred_skill_clusters": ["typescript", "systems"]
      },
      "negative_signals_json": {
        "avoided_problem_types": ["support", "maintenance"],
        "avoided_skill_clusters": ["php"]
      },
      "suppression_rules_json": {
        "soft_suppress": [
          {
            "rule": "startup_heavy_ops",
            "confidence": 0.71
          }
        ]
      },
      "last_updated": "ISO_TIMESTAMP"
    }
  ],
  "next_cursor": "opaque_cursor",
  "has_more": true
}
```

**What This Is:**
- Your previous AI conclusions
- Use this for incremental learning
- Avoid recomputing from scratch every time

---

## 6. `POST /ai/recommendations/update`

**Purpose**  
Write back AI conclusions. **This is the only AI endpoint with write access.**

**Request Body**

```json
{
  "user_id": "uuid",
  "positive_signals": {
    "preferred_problem_types": ["backend", "infrastructure"],
    "preferred_skill_clusters": ["typescript", "distributed-systems"]
  },
  "negative_signals": {
    "avoided_problem_types": ["support", "maintenance"],
    "avoided_skill_clusters": ["php", "wordpress"]
  },
  "suppression_rules": {
    "soft_suppress": [
      {
        "rule": "startup_heavy_ops",
        "confidence": 0.71
      }
    ]
  }
}
```

**Rules (Non-Negotiable):**

1. **Must not contradict user constraints**
   - If user says "remote only", you cannot suppress all remote jobs
   
2. **Must be soft, never absolute**
   - Use confidence scores, not binary rules
   - Always leave room for serendipity
   
3. **Fully overwrites previous recommendation profile**
   - This is not a merge operation
   - Send complete state every time

**Response**

```json
{
  "status": "ok",
  "user_id": "uuid",
  "updated_at": "ISO_TIMESTAMP"
}
```

**Errors:**

```json
{
  "error": {
    "message": "Suppression rules contradict user constraints",
    "status": 400
  }
}
```

---

## 7. Hard Guarantees (Non-Negotiable)

### The AI System Will Never Receive:

- ❌ Names
- ❌ Emails
- ❌ Company brands (pre-match)
- ❌ Resumes
- ❌ Colleges
- ❌ Past employer names
- ❌ Salary expectations beyond bands
- ❌ Any PII

### The AI System Cannot:

- ❌ Create matches
- ❌ Modify swipes
- ❌ Override constraints
- ❌ Hide all jobs in a category
- ❌ Make absolute decisions

### The AI System Should:

- ✅ Learn from behavioral signals (swipes)
- ✅ Respect hard constraints
- ✅ Provide soft recommendations
- ✅ Use confidence scores
- ✅ Allow serendipity

---

## 8. Execution Cadence (AI Operations)

### Real-Time (Per Swipe)
- Incremental counters via database triggers
- No heavy computation

### Batch Processing (GitHub Actions)
- **Frequency**: Every 6 or 12 hours
- **Trigger**: GitHub Actions cron job
- **Process**:
  1. Fetch new data via `/ai/data/*` endpoints
  2. Run recommendation model
  3. Write back via `/ai/recommendations/update`

### Writes
- Only to `RecommendationProfile` table
- Via `/ai/recommendations/update` endpoint
- Never to `User`, `Job`, `Swipe`, or `Match` tables

---

## 9. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions Cron                      │
│                    (Every 6-12 hours)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Fetch Training Data                        │
│  GET /ai/data/users                                         │
│  GET /ai/data/jobs                                          │
│  GET /ai/data/swipes                                        │
│  GET /ai/data/matches                                       │
│  GET /ai/data/recommendation-profiles                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Run Recommendation Model                        │
│  - Analyze swipe patterns                                   │
│  - Learn preferences                                        │
│  - Generate soft signals                                    │
│  - Calculate confidence scores                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Write Back Recommendations                      │
│  POST /ai/recommendations/update                            │
│  - Update RecommendationProfile table                       │
│  - Store positive/negative signals                          │
│  - Store suppression rules                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend Uses Recommendations                  │
│  - Job feed ranking                                         │
│  - Candidate feed ranking                                   │
│  - Match quality scoring                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Example AI Workflow

### Step 1: Fetch Data (Every 6 hours)

```bash
# Get users who updated in last 6 hours
GET /api/ai/data/users?since=2026-01-21T01:00:00Z
X-API-KEY: your_key

# Get recent swipes
GET /api/ai/data/swipes?since=2026-01-21T01:00:00Z
X-API-KEY: your_key

# Get recent matches
GET /api/ai/data/matches?since=2026-01-21T01:00:00Z
X-API-KEY: your_key
```

### Step 2: Process Data

```python
# Your AI model
for user in users:
    swipes = get_user_swipes(user.id)
    
    # Analyze patterns
    right_swipes = [s for s in swipes if s.direction == 'right']
    left_swipes = [s for s in swipes if s.direction == 'left']
    
    # Extract preferences
    preferred_skills = extract_common_skills(right_swipes)
    avoided_skills = extract_common_skills(left_swipes)
    
    # Generate recommendations
    recommendation = {
        "user_id": user.id,
        "positive_signals": {
            "preferred_skill_clusters": preferred_skills
        },
        "negative_signals": {
            "avoided_skill_clusters": avoided_skills
        },
        "suppression_rules": {
            "soft_suppress": generate_soft_rules(left_swipes)
        }
    }
```

### Step 3: Write Back

```bash
POST /api/ai/recommendations/update
X-API-KEY: your_key
Content-Type: application/json

{
  "user_id": "user-uuid",
  "positive_signals": {
    "preferred_problem_types": ["backend", "infrastructure"],
    "preferred_skill_clusters": ["typescript", "kubernetes"]
  },
  "negative_signals": {
    "avoided_problem_types": ["support"],
    "avoided_skill_clusters": ["php"]
  },
  "suppression_rules": {
    "soft_suppress": [
      {
        "rule": "avoid_legacy_stacks",
        "confidence": 0.75
      }
    ]
  }
}
```

---

## 11. Testing & Validation

### Health Check

```bash
# Verify AI API access
GET /api/health
X-API-KEY: your_key

# Should return 200 OK
```

### Data Quality Checks

```bash
# Check if you're getting data
GET /api/ai/data/users?limit=1
X-API-KEY: your_key

# Should return at least one user if any exist
```

### Write Validation

```bash
# Test recommendation update
POST /api/ai/recommendations/update
X-API-KEY: your_key

{
  "user_id": "test-user-id",
  "positive_signals": {},
  "negative_signals": {},
  "suppression_rules": {}
}

# Should return 200 OK
```

---

## TL;DR for AI Team

### Inputs You Get:

- ✅ Intent text
- ✅ Constraints (hard rules)
- ✅ Skills (evidence-based)
- ✅ Jobs (problem-first)
- ✅ Swipes (true preference signal)
- ✅ Matches (ground truth)

### Outputs You Provide:

- ✅ Soft preference signals
- ✅ Suppression hints (with confidence)
- ✅ Ranking bias metadata

### What You Cannot Do:

- ❌ Override constraints
- ❌ Create matches
- ❌ Modify swipes
- ❌ Access PII
- ❌ Make absolute decisions

---

## Support

For AI API issues:
- Check `DEPLOYMENT_SUMMARY.md` for deployment details
- Verify `AI_INTERNAL_API_KEY` is set correctly
- Check GitHub Actions logs for cron job execution

**This contract is final, stable, and future-proof.**

No more. No less.
