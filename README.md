# SABER - Intent-Based Job Matching Platform

**SABER** is a privacy-preserving, intent-driven job matching platform that connects candidates with opportunities based on their true career aspirations, not just keywords. Built with a swipe-based interface, SABER enables mutual matching between candidates and recruiters while maintaining anonymity until both parties express interest.

## 🎯 Core Philosophy

- **Intent Over Keywords**: Match based on what candidates want to achieve, not just what they've done
- **Privacy-First**: Identities remain hidden until mutual interest is confirmed
- **Constraint-Driven**: Hard constraints (location, visa, salary) are enforced before matching
- **Skill-Aware**: Leverages GitHub and LinkedIn data to extract and validate skills automatically

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL (Neon) with Prisma ORM
- Redis (Upstash) for caching
- Cloudinary for image storage
- OAuth 2.0 (Google, GitHub, LinkedIn)

**Frontend:**
- React + TypeScript + Vite
- TailwindCSS for styling
- React Query (@tanstack/react-query) for state management
- Framer Motion for animations

**Infrastructure:**
- Vercel (Backend & Frontend deployment)
- GitHub Actions (CI/CD)
- Upstash Redis (Caching layer)
- Neon PostgreSQL (Database)

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     SABER Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   Candidate  │         │   Recruiter  │                │
│  │   Frontend   │         │   Dashboard  │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         └────────┬───────────────┘                         │
│                  │                                         │
│         ┌────────▼─────────┐                              │
│         │   API Gateway    │                              │
│         │   (Express.js)   │                              │
│         └────────┬─────────┘                              │
│                  │                                         │
│    ┌─────────────┼─────────────┐                         │
│    │             │             │                         │
│ ┌──▼───┐    ┌───▼────┐   ┌───▼────┐                    │
│ │Redis │    │Postgres│   │Cloudinary│                   │
│ │Cache │    │  (Neon)│   │ Images  │                    │
│ └──────┘    └────────┘   └────────┘                    │
│                                                             │
│  ┌──────────────────────────────────────────┐            │
│  │  OAuth Providers: Google, GitHub, LinkedIn│            │
│  └──────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Neon account)
- Redis instance (or Upstash account)
- Cloudinary account
- OAuth credentials (Google, GitHub, LinkedIn)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sreecharan-desu/SABER.git
cd SABER
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Server URLs
BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OAuth - GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# OAuth - LinkedIn
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

# AI Internal Key (for cron jobs)
AI_INTERNAL_API_KEY="your-ai-api-key"

# Email (Gmail SMTP)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-specific-password"

# Redis
REDIS_URL="rediss://default:password@host:6379"

# Swipe Limit
SWIPE_LIMIT=100

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

4. **Initialize the database**
```bash
npx prisma db push
```

5. **Run the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
SABER/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── src/
│   ├── config/                # Configuration files
│   │   ├── cloudinary.ts
│   │   ├── env.ts
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── controllers/           # Route handlers
│   │   ├── admin.controller.ts
│   │   ├── ai.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── candidate.controller.ts
│   │   ├── job.controller.ts
│   │   ├── match.controller.ts
│   │   ├── recruiter.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── upload.middleware.ts
│   ├── routes/                # API routes
│   │   ├── admin.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── candidate.routes.ts
│   │   ├── job.routes.ts
│   │   ├── match.routes.ts
│   │   ├── recruiter.routes.ts
│   │   ├── user.routes.ts
│   │   └── index.ts
│   ├── services/              # Business logic
│   │   ├── email.service.ts
│   │   ├── github.data.service.ts
│   │   ├── linkedin.data.service.ts
│   │   ├── oauth.providers.ts
│   │   └── user.service.ts
│   ├── utils/                 # Utilities
│   │   ├── cache.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── scripts/
│   └── benchmark.ts           # Performance testing
├── .env                       # Environment variables
├── package.json
├── tsconfig.json
└── vercel.json               # Vercel deployment config
```

---

## 🔐 Authentication Flow

1. **User initiates OAuth** (Google/GitHub/LinkedIn)
2. **Backend receives callback** with authorization code
3. **Backend exchanges code** for access token
4. **Profile data extracted** from OAuth provider
5. **User created/linked** in database
6. **JWT token generated** and returned to frontend
7. **Background jobs** extract skills from GitHub/LinkedIn

### Onboarding Flow

**For Candidates:**
1. Link GitHub and LinkedIn accounts
2. Provide intent statement (what they want to achieve)
3. Set hard constraints (location, visa, salary range)
4. Skills auto-extracted from linked accounts

**For Recruiters:**
1. Link GitHub and LinkedIn accounts
2. Create company profile
3. Upload company logo and cover image
4. Post first job with problem statement and requirements

---

## 📊 Database Schema

### Core Models

**User**
- Stores basic profile information
- Role: `candidate`, `recruiter`, or `admin`
- Links to OAuth accounts
- Contains intent and constraints

**Company**
- Owned by a recruiter
- Stores company details and branding
- Links to jobs

**Job**
- Posted by companies
- Contains problem statement, expectations, skills required
- Constraint-based matching

**Swipe**
- Records candidate/recruiter swipes
- Tracks direction (left/right)
- Links to potential matches

**Match**
- Created when mutual right-swipes occur
- Reveals identities to both parties
- Enables messaging

**Application**
- Auto-created on candidate right-swipe
- Tracks application status
- Managed by recruiters

---

## 🎨 Admin Dashboard

The admin dashboard is a separate React application for recruiters to manage their presence on SABER.

### Setup

```bash
cd saber-admin-dashboard
npm install
npm run dev
```

### Features

- **Company Profile Management**: Update company details, logo, and cover image
- **Job Posting**: Create and manage job listings
- **Candidate Feed**: Swipe on candidates who match job requirements
- **Signals of Interest**: View candidates who swiped right on your jobs
- **Applications**: Track and manage candidate applications

### Environment Variables

Create `.env` in `saber-admin-dashboard/`:

```env
VITE_API_BASE_URL="http://localhost:3000"
VITE_OAUTH_REDIRECT_URI="http://localhost:5173/auth/callback"
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
VITE_GITHUB_CLIENT_ID="your-github-client-id"
VITE_LINKEDIN_CLIENT_ID="your-linkedin-client-id"
```

---

## 🚀 API Endpoints

### Authentication
- `GET /auth/oauth/callback` - OAuth callback handler
- `POST /auth/oauth/callback` - Exchange code for token
- `POST /auth/link-provider` - Link additional OAuth account
- `GET /auth/me` - Get current user profile

### User Management
- `POST /user/intent` - Update candidate intent
- `POST /user/constraints` - Update user constraints
- `PUT /user/role` - Switch user role

### Jobs (Candidate)
- `GET /jobs/feed` - Get personalized job feed
- `POST /jobs/swipe` - Swipe on a job

### Recruiters
- `POST /recruiters/company` - Create company profile
- `GET /recruiters/company` - Get company details
- `PUT /recruiters/company/images` - Upload company images
- `POST /recruiters/job` - Create job posting
- `GET /recruiters/jobs` - List all jobs
- `PUT /recruiters/job/:id` - Update job
- `DELETE /recruiters/job/:id` - Delete job
- `GET /recruiters/feed` - Get candidate feed
- `POST /recruiters/swipe` - Swipe on candidate
- `GET /recruiters/signals` - Get signals of interest

### Candidates
- `GET /candidates/bookmarks` - Get bookmarked jobs
- `POST /candidates/bookmarks` - Bookmark a job
- `DELETE /candidates/bookmarks/:job_id` - Remove bookmark
- `GET /candidates/applications` - Get all applications
- `POST /candidates/applications` - Submit application
- `DELETE /candidates/applications/:id` - Withdraw application

### Matches
- `GET /matches` - Get all matches
- `POST /matches/messages` - Send message in match

### Admin
- `GET /admin/metrics` - Get platform metrics
- `POST /admin/ai/keys` - Rotate AI API keys

---

## ⚡ Performance Optimizations

### Caching Strategy

**Redis Caching:**
- Company profiles: 1 hour TTL
- Job listings: 5 minutes TTL
- User profiles: 1 minute TTL
- Candidate/Recruiter feeds: 1 minute TTL
- Signals of interest: 30 seconds TTL

**React Query (Frontend):**
- Default stale time: 5 minutes
- Garbage collection: 20 minutes
- Disabled automatic refetching
- Manual refresh controls

### Database Indexes

Optimized indexes on:
- `Job`: `[active, created_at]` for feed queries
- `Swipe`: `[target_user_id, direction]` for match checks
- `Application`: `[job_id, status]` for filtering
- `User`: `[role, id]` for candidate pagination

### Rate Limiting

- Global: 100 requests/15 minutes
- Auth endpoints: 5 requests/15 minutes
- Swipe endpoints: 50 requests/15 minutes
- AI endpoints: 10 requests/minute

---

## 📈 Performance Benchmarks

Average response times (local development):

| Endpoint | Response Time | Notes |
|----------|--------------|-------|
| `GET /health` | ~45ms | Health check |
| `GET /auth/me` | ~250ms | Cached user profile |
| `GET /recruiters/company` | ~230ms | Cached company data |
| `GET /recruiters/jobs` | ~235ms | Cached job list |
| `GET /recruiters/feed` | ~220ms | Cached candidate feed |
| `GET /jobs/feed` | ~220ms | Cached job feed |
| `GET /matches` | ~290ms | Match retrieval |

*First-time (cold) requests may take longer due to cache population.*

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **OAuth 2.0**: Trusted identity providers
- **Rate Limiting**: Prevents abuse
- **Helmet.js**: Security headers
- **CORS**: Configured for specific origins
- **Environment Variables**: Sensitive data protection
- **Request ID Tracking**: Audit trail
- **Swipe Limits**: Daily limits to prevent spam

---

## 🌐 Deployment

### Backend (Vercel)

1. **Connect GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel auto-deploys on push to main

Production URL: `https://saber-api-backend.vercel.app`

### Frontend (Vercel)

1. **Navigate to dashboard directory**
```bash
cd saber-admin-dashboard
```

2. **Deploy to Vercel**
```bash
vercel --prod
```

Production URL: `https://saber-admin-dashboard.vercel.app`

### Environment Variables Checklist

**Backend (Vercel):**
- ✅ DATABASE_URL
- ✅ JWT_SECRET
- ✅ REDIS_URL
- ✅ GOOGLE_CLIENT_ID & SECRET
- ✅ GITHUB_CLIENT_ID & SECRET
- ✅ LINKEDIN_CLIENT_ID & SECRET
- ✅ CLOUDINARY credentials
- ✅ EMAIL_USER & EMAIL_PASS
- ✅ BASE_URL (production URL)
- ✅ FRONTEND_URL (dashboard URL)

**Frontend (Vercel):**
- ✅ VITE_API_BASE_URL
- ✅ VITE_OAUTH_REDIRECT_URI
- ✅ VITE_GOOGLE_CLIENT_ID
- ✅ VITE_GITHUB_CLIENT_ID
- ✅ VITE_LINKEDIN_CLIENT_ID

---

## 🧪 Testing

### Run Performance Benchmark

```bash
npx tsx scripts/benchmark.ts
```

This will test all major API endpoints with real database users and display:
- Response times
- Status codes
- Response previews
- Average latency

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

Built by **SreeCharan Desu** and the SABER team.

---

## 🙏 Acknowledgments

- **Neon** for PostgreSQL hosting
- **Upstash** for Redis caching
- **Vercel** for deployment platform
- **Cloudinary** for image management
- **Prisma** for ORM
- **TanStack Query** for state management

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

**Live Demo:** [https://saber-admin-dashboard.vercel.app](https://saber-admin-dashboard.vercel.app)

**API Documentation:** [https://saber-api-backend.vercel.app/health](https://saber-api-backend.vercel.app/health)
