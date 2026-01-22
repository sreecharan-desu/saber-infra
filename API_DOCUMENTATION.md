# SABER API Documentation for Frontend Implementation

This document provides a comprehensive guide for implementing the SABER frontend. It covers all API endpoints, request/response formats, and core logic.

## 🗝️ Core Architecture & Auth

### Base URL
- Production: `https://saber-api-backend.vercel.app/api`
- Local: `http://localhost:3000/api`

### Authentication
All protected routes require a **Bearer JWT Token** in the header:
`Authorization: Bearer <your_jwt_token>`

### 🚀 The Onboarding Flag (Crucial)
The backend returns an `onboarding: boolean` flag in the user object.
- **`onboarding: true`**: The user has NOT connected both GitHub and LinkedIn. The frontend MUST redirect them to the connection/onboarding screen.
- **`onboarding: false`**: Both accounts are linked. The user can proceed to their feed.

---

## 🔐 1. Authentication & Session

### **POST** `/auth/oauth/callback`
Exchanges an OAuth code for a JWT.
- **Body**:
  ```json
  {
    "provider": "google" | "github" | "linkedin",
    "code": "auth_code_from_url",
    "redirect_uri": "optional_override"
  }
  ```
- **Response**:
  ```json
  {
    "token": "JWT_STRING",
    "user": { "id": "...", "email": "...", "onboarding": true/false, "role": "candidate/recruiter", ... }
  }
  ```

### **GET** `/auth/me`
Fetches the current user's profile and connection status.
- **Response**: User object with `onboarding` flag and `oauth_accounts` array.

### **POST** `/auth/link-provider`
Links an additional OAuth account (GitHub/LinkedIn) to the logged-in user.
- **Body**: Same as OAuth callback.

---

## 👤 2. User Profile & Onboarding

### **PUT** `/user/role`
Switch between Candidate and Recruiter roles.
- **Body**: `{ "role": "candidate" | "recruiter" }`

### **POST** `/user/intent`
Update the user's intent and reasoning (mostly for Candidates).
- **Body**: `{ "intent_text": "...", "why_text": "..." }`

### **POST** `/user/constraints`
Update user constraints (salary, location, remote status).
- **Body**: Key-value pairs of constraints (e.g., `{ "salary": 100000, "location": "Remote" }`).

---

## 💼 3. Candidate Flow

### **GET** `/jobs/feed`
Fetches a ranked list of jobs for the candidate.
- **Logic**: Filters out already swiped jobs and jobs that violate hard constraints.
- **Response**: 
  ```json
  {
    "jobs": [
      { "id": "...", "problem_statement": "...", "skills_required": [], "constraints": {} }
    ]
  }
  ```
  *Note: Company names are hidden until a match is made.*

### **POST** `/jobs/swipe`
Records a candidate's interest in a job.
- **Body**: `{ "job_id": "...", "direction": "left" | "right" }`
- **Logic**: 
  - Limit: 10 "right" swipes per day.
  - If a mutual match occurs (Recruiter already swiped right on this user for this job), the response will include match data.

---

## 🏢 4. Recruiter Flow

### **POST** `/company`
Creates a company profile. (Recruiter only)
- **Body**: `{ "name": "...", "website": "..." }`

### **POST** `/job`
Creates a new job posting. (Recruiter only)
- **Body**:
  ```json
  {
    "company_id": "...",
    "problem_statement": "...",
    "expectations": "...",
    "non_negotiables": "...",
    "deal_breakers": "...",
    "skills_required": ["React", "Node"],
    "constraints_json": { "location": "NYC", "salary": 150000 }
  }
  ```

### **GET** `/recruiter/feed`
Fetches a list of candidates matching the recruiter's active jobs.
- **Response**: List of candidates with their `intent_text` and `skills`.

### **POST** `/recruiter/swipe`
Recruiter swiping on a candidate.
- **Body**: `{ "job_id": "...", "target_user_id": "...", "direction": "left" | "right" }`

---

## 🤝 5. Matches & Messaging

### **GET** `/matches`
List all mutual matches for the current user.
- **Details**: Inlcudes job info, company info, and the reveal status.

### **POST** `/matches/messages`
Send a message in a match.
- **Body**: `{ "match_id": "...", "content": "..." }`

---

## 🛡️ 6. Admin Endpoints

### **GET** `/admin/metrics`
High-level system metrics (Admin role only).
- **Response**: `{ "overview": { "total_swipes": 100, "match_rate": "5%" }, ... }`

### **POST** `/admin/ai/keys`
Rotate the API keys used by the AI engine.
- **Response**: Returns the new `X-API-KEY`.

---

## 🤖 7. AI Engine Access (Internal)
These routes require `X-API-KEY` instead of Bearer JWT.

- **GET** `/ai/data/users`: Bulk fetch candidate data for model training.
- **GET** `/ai/data/jobs`: Bulk fetch job data.
- **POST** `/ai/recommendations/update`: Push model predictions (scores/clusters) back to the user profiles.

---

## 📝 Frontend Implementation Checklist
1. **Auth**: Use the `/auth/oauth/callback` to get the token.
2. **Onboarding**: Check `user.onboarding`. If `true`, force the user to connect LinkedIn/GitHub before allowing them into the app.
3. **Role Check**: Redirect users to different dashboards based on `user.role`.
4. **Feeds**: Call `/jobs/feed` for candidates and `/recruiter/feed` for recruiters.
5. **Matches**: Use `/matches` to show the inbox.
