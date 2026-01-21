# SABER API Documentation - Frontend

> **Base URL**: `https://saber-api-backend.vercel.app/api`  
> *(Update this URL as needed, Bhonu)*

## Authentication

All protected endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
```

- JWT is issued **only** via OAuth
- No password-based authentication
- No email verification required

---

## 1. Auth & Session

### 1.1 `POST /auth/oauth/callback`

**Purpose**  
Complete OAuth login. Create or fetch user. Issue JWT.

**Request**

```json
{
  "provider": "google | github | linkedin",
  "code": "string",
  "redirect_uri": "string (optional)"
}
```

**Response**

```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "role": "candidate | recruiter | admin",
    "name": "string",
    "email": "string",
    "photo_url": "string",
    "created_at": "ISO_TIMESTAMP"
  }
}
```

**Notes**:
- For GitHub users, skill extraction happens automatically in the background
- The `redirect_uri` defaults to the backend callback URL if not provided

---

### 1.2 `POST /auth/link-provider`

**Purpose**  
Link GitHub or LinkedIn to existing account.

**Authentication**: Required

**Request**

```json
{
  "provider": "github | linkedin",
  "code": "string",
  "redirect_uri": "string (optional)"
}
```

**Response**

```json
{
  "status": "ok",
  "message": "Provider linked successfully"
}
```

**Notes**:
- Linking GitHub triggers skill extraction
- Cannot link a provider already linked to another user

---

### 1.3 `GET /auth/me`

**Purpose**  
App bootstrap. Session restore.

**Authentication**: Required

**Response**

```json
{
  "id": "uuid",
  "role": "candidate | recruiter | admin",
  "name": "string",
  "email": "string",
  "photo_url": "string",
  "intent_text": "string",
  "why_text": "string",
  "constraints_json": {},
  "created_at": "ISO_TIMESTAMP",
  "updated_at": "ISO_TIMESTAMP"
}
```

---

## 2. Candidate Onboarding

### 2.1 `POST /user/intent`

**Purpose**  
Save candidate intent.

**Authentication**: Required

**Request**

```json
{
  "intent_text": "string (max 300 chars)",
  "why_text": "string (max 200 chars)"
}
```

**Response**

```json
{
  "status": "saved",
  "user": {
    "id": "uuid",
    "intent_text": "string",
    "why_text": "string"
  }
}
```

---

### 2.2 `POST /user/constraints`

**Purpose**  
Save non-negotiable constraints.

**Authentication**: Required

**Request**

```json
{
  "availability": "full-time | part-time | contract",
  "work_mode": "remote | hybrid | onsite",
  "compensation_band": "string",
  "location": "string",
  "risk_tolerance": "startup | mid | stable"
}
```

**Response**

```json
{
  "status": "saved",
  "constraints": {}
}
```

---

### 2.3 `GET /user/skills`

**Purpose**  
Fetch auto-derived skills for confirmation UI.

**Authentication**: Required

**Response**

```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "TypeScript",
      "source": "github | linkedin",
      "confidence_score": 0.85
    }
  ]
}
```

**Frontend Rules:**
- Can reorder
- Can remove
- **Cannot add new skills** (skills are evidence-based only)

---

## 3. Job Feed & Swiping (Core UX)

### 3.1 `GET /jobs/feed`

**Purpose**  
Fetch swipe cards. Identity hidden. Recommendation-aware.

**Authentication**: Required

**Query Parameters**

- `page=1` (default: 1)
- `limit=10` (default: 10, max: 50)

**Response**

```json
{
  "data": [
    {
      "job_id": "uuid",
      "problem_statement": "string",
      "expectations": "string",
      "non_negotiables": "string",
      "deal_breakers": "string",
      "skills_required": ["React", "Node.js"],
      "constraints": {
        "work_mode": "remote | hybrid | onsite",
        "compensation_band": "string",
        "location": "string"
      },
      "created_at": "ISO_TIMESTAMP"
    }
  ],
  "has_more": true,
  "page": 1,
  "limit": 10
}
```

**Guarantees:**
- All jobs already satisfy hard constraints
- No previously swiped jobs included
- Company identity is hidden

---

### 3.2 `POST /swipe`

**Purpose**  
Register swipe action.

**Authentication**: Required

**Request**

```json
{
  "job_id": "uuid",
  "direction": "left | right"
}
```

**Response (no match)**

```json
{
  "status": "recorded",
  "match_created": false
}
```

**Response (match created)**

```json
{
  "status": "recorded",
  "match_created": true,
  "match_id": "uuid"
}
```

**Errors:**
- `429 Too Many Requests` if right-swipe limit exceeded
- `400 Bad Request` if job_id is invalid or already swiped

---

### 3.3 `GET /limits`

**Purpose**  
Show swipe quota UI.

**Authentication**: Required

**Response**

```json
{
  "right_swipes_remaining": 3,
  "resets_at": "ISO_TIMESTAMP"
}
```

---

## 4. Matches & Chat

### 4.1 `GET /matches`

**Purpose**  
Fetch all matches.

**Authentication**: Required

**Response**

```json
{
  "data": [
    {
      "match_id": "uuid",
      "job_id": "uuid",
      "company": {
        "name": "string",
        "website": "string"
      },
      "role_title": "string",
      "explainability": {
        "skill_overlap": ["React", "Node.js"],
        "constraint_alignment": true,
        "intent_similarity": "high | medium | low"
      },
      "reveal_status": false,
      "created_at": "ISO_TIMESTAMP"
    }
  ]
}
```

**Note:** Identity is revealed only here (post-match).

---

### 4.2 `GET /messages/:match_id`

**Purpose**  
Load chat history.

**Authentication**: Required

**Response**

```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "content": "string",
      "created_at": "ISO_TIMESTAMP"
    }
  ]
}
```

---

### 4.3 `POST /messages`

**Purpose**  
Send message.

**Authentication**: Required

**Request**

```json
{
  "match_id": "uuid",
  "content": "string"
}
```

**Response**

```json
{
  "status": "sent",
  "message": {
    "id": "uuid",
    "sender_id": "uuid",
    "content": "string",
    "created_at": "ISO_TIMESTAMP"
  }
}
```

---

## 5. Recruiter / Company Flow

### 5.1 `POST /company`

**Purpose**  
Register company.

**Authentication**: Required (role: recruiter)

**Request**

```json
{
  "name": "string",
  "website": "string"
}
```

**Response**

```json
{
  "status": "created",
  "company": {
    "id": "uuid",
    "name": "string",
    "website": "string",
    "verified": false
  }
}
```

---

### 5.2 `POST /job`

**Purpose**  
Create job as problem statement.

**Authentication**: Required (role: recruiter)

**Request**

```json
{
  "company_id": "uuid",
  "problem_statement": "string",
  "expectations": "string",
  "non_negotiables": "string",
  "deal_breakers": "string",
  "skills_required": ["React", "TypeScript"],
  "constraints": {
    "work_mode": "remote | hybrid | onsite",
    "location": "string",
    "compensation_band": "string"
  }
}
```

**Response**

```json
{
  "job_id": "uuid",
  "status": "active",
  "created_at": "ISO_TIMESTAMP"
}
```

---

### 5.3 `GET /recruiter/candidates/feed`

**Purpose**  
Recruiter swipe feed.

**Authentication**: Required (role: recruiter)

**Query Parameters**

- `job_id=uuid` (required)
- `page=1`
- `limit=10`

**Response**

```json
{
  "data": [
    {
      "candidate_id": "uuid",
      "intent_text": "string",
      "why_text": "string",
      "constraints": {
        "availability": "full-time",
        "work_mode": "remote",
        "location": "string"
      },
      "skills": [
        {
          "name": "React",
          "confidence_score": 0.9
        }
      ]
    }
  ],
  "has_more": true
}
```

---

### 5.4 `POST /recruiter/swipe`

**Purpose**  
Recruiter swipes on candidates.

**Authentication**: Required (role: recruiter)

**Request**

```json
{
  "candidate_id": "uuid",
  "job_id": "uuid",
  "direction": "left | right"
}
```

**Response**

```json
{
  "status": "recorded",
  "match_created": false
}
```

---

## 6. Admin (Frontend Visible)

### 6.1 `GET /admin/metrics`

**Purpose**  
System health and quality metrics.

**Authentication**: Required (role: admin)

**Response**

```json
{
  "swipe_to_match_ratio": 0.14,
  "avg_intent_quality": 0.72,
  "constraint_mismatch_rate": 0.31,
  "total_users": 1234,
  "total_jobs": 567,
  "total_matches": 89
}
```

---

## 7. Hard Frontend Guarantees

**Frontend will never receive:**

- Resume data (pre-match)
- College names
- Past company names
- User emails (except for authenticated user)
- Recruiter identity (pre-match)
- Salary expectations beyond bands

**Frontend must never assume:**

- Feed ordering logic
- Match creation timing
- Recommendation behavior
- Skill derivation logic

---

## 8. Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "status": 400
  }
}
```

**Common Status Codes:**

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## TL;DR for Frontend Team

**You build:**

- Onboarding flows
- Swipe UI
- Chat interface
- Dashboards

**You do NOT:**

- Filter jobs manually
- Enforce swipe limits client-side
- Reveal identities early
- Apply recommendation logic client-side
- Add skills manually

**The backend is the authority.**

---

## OAuth Integration Guide

### Google OAuth Flow

1. Redirect user to Google OAuth:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=a3937a823-d4e8-425d-b156-192b89e93f88&
     redirect_uri=https://saber-api-backend.vercel.app/api/auth/oauth/callback&
     response_type=code&
     scope=openid email profile
   ```

2. User authorizes and is redirected back with `code`

3. Frontend sends code to backend:
   ```javascript
   POST /api/auth/oauth/callback
   {
     "provider": "google",
     "code": "authorization_code_from_google"
   }
   ```

4. Backend returns JWT and user data

5. Store JWT in localStorage/sessionStorage

6. Include JWT in all subsequent requests:
   ```javascript
   headers: {
     'Authorization': `Bearer ${jwt_token}`
   }
   ```

### GitHub OAuth Flow

Same as Google, but:
- Client ID: `Ov23lijOpMktUNXB6FYD`
- Scopes: `read:user user:email public_repo`
- Automatically triggers skill extraction

### LinkedIn OAuth Flow

Same pattern, scopes: `openid profile email`

---

## Development vs Production

**Local Development:**
- Base URL: `http://localhost:3000/api`
- OAuth callbacks: `http://localhost:3000/api/auth/oauth/callback`

**Production:**
- Base URL: `https://saber-api-backend.vercel.app/api`
- OAuth callbacks: `https://saber-api-backend.vercel.app/api/auth/oauth/callback`

---

## Support

For API issues or questions, contact the backend team or check the deployment summary in `DEPLOYMENT_SUMMARY.md`.
