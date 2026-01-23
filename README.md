# SABER - Intent-Based Job Matching Platform

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)

> **Privacy-Preserving Career Matching**
> *Connecting candidates with opportunities based on intent, not just keywords. Mutual matching with identity protection until both parties express interest.*

---

## Architecture Overview

SABER employs a modern, scalable architecture with aggressive caching strategies and privacy-first design principles.

```mermaid
graph TB
    subgraph Client_Layer ["Client Applications"]
        Candidate["Candidate App<br/>(React + Vite)"]
        Dashboard["Recruiter Dashboard<br/>(React + Vite)"]
    end

    subgraph API_Gateway ["API Layer"]
        Express["Express.js API<br/>(TypeScript)"]
        Auth["OAuth 2.0 Handler"]
        RateLimit["Rate Limiter"]
    end

    subgraph Business_Logic ["Business Logic"]
        MatchEngine["Intent Matching Engine"]
        SwipeLogic["Swipe & Match Logic"]
        ConstraintFilter["Constraint Validator"]
    end

    subgraph Data_Layer ["Data Persistence"]
        Postgres[("PostgreSQL<br/>(Neon)")]
        Redis[("Redis Cache<br/>(Upstash)")]
        Cloudinary["Cloudinary<br/>(Image Storage)"]
    end

    subgraph External_Services ["External Services"]
        Google["Google OAuth"]
        GitHub["GitHub OAuth"]
        LinkedIn["LinkedIn OAuth"]
    end

    Candidate --> Express
    Dashboard --> Express
    Express --> Auth
    Express --> RateLimit
    RateLimit --> MatchEngine
    RateLimit --> SwipeLogic
    MatchEngine --> ConstraintFilter
    SwipeLogic --> Postgres
    ConstraintFilter --> Postgres
    Express --> Redis
    Express --> Cloudinary
    Auth --> Google
    Auth --> GitHub
    Auth --> LinkedIn
```

## System Flow: Candidate-Recruiter Matching

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as SABER API
    participant DB as PostgreSQL
    participant R as Redis Cache
    participant Rec as Recruiter

    C->>API: GET /jobs/feed
    API->>R: Check cache
    alt Cache Hit
        R-->>API: Return cached feed
    else Cache Miss
        API->>DB: Query jobs + constraints
        DB-->>API: Return filtered jobs
        API->>R: Store in cache (60s TTL)
    end
    API-->>C: Return personalized feed

    C->>API: POST /jobs/swipe (right)
    API->>DB: Create swipe record
    API->>DB: Create application
    API->>DB: Check for reciprocal swipe
    
    alt Mutual Match
        DB-->>API: Recruiter swiped right
        API->>DB: Create match record
        API->>DB: Update application status
        API-->>C: Match created!
        API-->>Rec: Notify match
    else No Match Yet
        API-->>C: Swipe recorded
    end
    
    API->>R: Invalidate feed cache
```

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Express.js + TypeScript | High-performance async API with type safety |
| **Frontend** | React 18 + TypeScript | Component-based UI with strict typing |
| **Database** | PostgreSQL (Neon) | Relational data with ACID guarantees |
| **Cache** | Redis (Upstash) | Sub-100ms response times for hot data |
| **ORM** | Prisma | Type-safe database access with migrations |
| **State** | TanStack Query | Intelligent client-side caching |
| **Auth** | OAuth 2.0 | Trusted identity via Google, GitHub, LinkedIn |
| **Storage** | Cloudinary | CDN-backed image delivery |
| **Deployment** | Vercel | Edge-optimized serverless functions |
| **Styling** | TailwindCSS | Utility-first responsive design |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- OAuth credentials (Google, GitHub, LinkedIn)
- Cloudinary account

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/sreecharan-desu/SABER.git
cd SABER
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment variables**

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
JWT_SECRET="your-secure-jwt-secret-min-32-chars"
REDIS_URL="rediss://default:password@host:6379"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**4. Initialize database**
```bash
npx prisma db push
```

**5. Start development server**
```bash
npm run dev
```

API available at `http://localhost:3000`

---

## Project Structure

```
SABER/
├── prisma/
│   ├── schema.prisma              # Database schema with optimized indexes
│   └── migrations/                # Migration history
├── src/
│   ├── config/                    # Configuration modules
│   │   ├── cloudinary.ts          # Image upload configuration
│   │   ├── env.ts                 # Environment validation
│   │   ├── prisma.ts              # Database client
│   │   └── redis.ts               # Cache client
│   ├── controllers/               # Request handlers
│   │   ├── admin.controller.ts    # Platform metrics
│   │   ├── auth.controller.ts     # OAuth & JWT
│   │   ├── candidate.controller.ts # Bookmarks & applications
│   │   ├── job.controller.ts      # Job feed & swipes
│   │   ├── match.controller.ts    # Match & messaging
│   │   ├── recruiter.controller.ts # Company & job management
│   │   └── user.controller.ts     # Profile updates
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT validation
│   │   ├── rateLimit.middleware.ts # Request throttling
│   │   └── upload.middleware.ts   # Multipart form handling
│   ├── routes/                    # API route definitions
│   ├── services/                  # Business logic
│   │   ├── email.service.ts       # Transactional emails
│   │   ├── github.data.service.ts # Skill extraction
│   │   ├── linkedin.data.service.ts # Profile enrichment
│   │   ├── oauth.providers.ts     # OAuth integrations
│   │   └── user.service.ts        # User management
│   ├── utils/
│   │   ├── cache.ts               # Redis wrapper
│   │   ├── jwt.ts                 # Token generation
│   │   └── logger.ts              # Structured logging
│   ├── app.ts                     # Express configuration
│   └── server.ts                  # Application entry point
├── scripts/
│   └── benchmark.ts               # Performance testing
└── vercel.json                    # Deployment configuration
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as SABER API
    participant OAuth as OAuth Provider
    participant DB as Database

    U->>FE: Click "Login with Google"
    FE->>OAuth: Redirect to OAuth consent
    OAuth->>FE: Redirect with auth code
    FE->>API: POST /auth/oauth/callback
    API->>OAuth: Exchange code for token
    OAuth-->>API: Access token + profile
    API->>DB: Find or create user
    DB-->>API: User record
    API->>API: Generate JWT
    API-->>FE: Return JWT + user data
    FE->>FE: Store JWT in localStorage
    FE->>API: Subsequent requests with JWT
    API->>API: Validate JWT
    API-->>FE: Protected resource
```

---

## Database Schema

### Core Models

**User**
- Identity and profile information
- Role: `candidate`, `recruiter`, or `admin`
- Intent statement and constraints
- Links to OAuth accounts

**Company**
- Recruiter-owned organization profile
- Branding assets (logo, cover image)
- Links to job postings

**Job**
- Problem statement and expectations
- Required skills and constraints
- Active/inactive status

**Swipe**
- Directional preference (left/right)
- Links user to job or recruiter to candidate
- Timestamp for match detection

**Match**
- Created on mutual right-swipes
- Reveals identities to both parties
- Enables direct messaging

**Application**
- Auto-created on candidate right-swipe
- Status tracking (pending, reviewing, interview, accepted, rejected)
- Managed by recruiters

---

## API Endpoints

### Authentication
```
GET  /auth/oauth/callback       OAuth provider callback
POST /auth/oauth/callback       Exchange code for JWT
POST /auth/link-provider        Link additional OAuth account
GET  /auth/me                   Get current user profile
```

### User Management
```
POST /user/intent               Update candidate intent
POST /user/constraints          Update user constraints
PUT  /user/role                 Switch user role
```

### Jobs (Candidate)
```
GET  /jobs/feed                 Personalized job feed
POST /jobs/swipe                Swipe on job
```

### Recruiters
```
POST   /recruiters/company           Create company profile
GET    /recruiters/company           Get company details
PUT    /recruiters/company/images   Upload branding assets
POST   /recruiters/job              Create job posting
GET    /recruiters/jobs             List all jobs
PUT    /recruiters/job/:id          Update job
DELETE /recruiters/job/:id          Delete job
GET    /recruiters/feed             Get candidate feed
POST   /recruiters/swipe            Swipe on candidate
GET    /recruiters/signals          Get signals of interest
```

### Candidates
```
GET    /candidates/bookmarks              Get bookmarked jobs
POST   /candidates/bookmarks              Bookmark job
DELETE /candidates/bookmarks/:job_id     Remove bookmark
GET    /candidates/applications           Get all applications
POST   /candidates/applications           Submit application
DELETE /candidates/applications/:id      Withdraw application
```

### Matches
```
GET  /matches                   Get all matches
POST /matches/messages          Send message
```

### Admin
```
GET  /admin/metrics             Platform analytics
POST /admin/ai/keys             Rotate AI API keys
```

---

## Performance Optimizations

### Caching Strategy

| Resource | TTL | Invalidation Trigger |
| :--- | :--- | :--- |
| Company profiles | 60 minutes | Profile update, image upload |
| Job listings | 5 minutes | Job creation, update, deletion |
| User profiles | 60 seconds | Profile update, role change |
| Candidate feed | 60 seconds | Swipe action |
| Recruiter feed | 60 seconds | Swipe action |
| Signals of interest | 30 seconds | Swipe action |

### Database Indexes

```sql
-- Optimized for feed generation
CREATE INDEX idx_job_active_created ON Job(active, created_at);

-- Optimized for match detection
CREATE INDEX idx_swipe_target_direction ON Swipe(target_user_id, direction);

-- Optimized for application filtering
CREATE INDEX idx_application_job_status ON Application(job_id, status);

-- Optimized for candidate pagination
CREATE INDEX idx_user_role_id ON User(role, id);
```

### Rate Limiting

| Endpoint Category | Limit | Window |
| :--- | :--- | :--- |
| Global | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Swipe actions | 50 requests | 15 minutes |
| AI endpoints | 10 requests | 1 minute |

---

## Performance Benchmarks

Average response times (production environment):

| Endpoint | Cold Start | Cached | Notes |
| :--- | :--- | :--- | :--- |
| `GET /health` | 45ms | N/A | Health check |
| `GET /auth/me` | 250ms | 50ms | User profile with OAuth accounts |
| `GET /recruiters/company` | 230ms | 40ms | Company profile with images |
| `GET /recruiters/jobs` | 235ms | 45ms | Job list with company data |
| `GET /recruiters/feed` | 960ms | 50ms | Candidate matching algorithm |
| `GET /jobs/feed` | 700ms | 50ms | Job matching algorithm |
| `GET /matches` | 290ms | 60ms | Match retrieval with details |

**Note:** Cold start times represent first request without cache. Subsequent requests leverage Redis caching for sub-100ms responses.

---

## Security Features

**Authentication & Authorization**
- JWT-based stateless authentication
- OAuth 2.0 with trusted providers
- Role-based access control (RBAC)

**Data Protection**
- Identity masking until mutual match
- Encrypted database connections
- Secure environment variable management

**Request Security**
- Helmet.js security headers
- CORS configuration
- Rate limiting per endpoint category
- Request ID tracking for audit trails

**Operational Security**
- Daily swipe limits to prevent spam
- Unique constraint enforcement
- Transaction-based match creation
- Automatic cache invalidation

---

## Deployment

### Backend (Vercel)

**1. Connect repository to Vercel**

**2. Configure environment variables**
- Navigate to Project Settings > Environment Variables
- Add all variables from `.env.example`
- Update `BASE_URL` and `FRONTEND_URL` to production URLs

**3. Deploy**
```bash
vercel --prod
```

Production URL: `https://saber-api-backend.vercel.app`

### Frontend (Vercel)

**1. Navigate to dashboard directory**
```bash
cd saber-admin-dashboard
```

**2. Configure environment variables**

Create `.env` in dashboard directory:
```env
VITE_API_BASE_URL="https://saber-api-backend.vercel.app"
VITE_OAUTH_REDIRECT_URI="https://saber-admin-dashboard.vercel.app/auth/callback"
VITE_GOOGLE_CLIENT_ID="your-google-client-id"
VITE_GITHUB_CLIENT_ID="your-github-client-id"
VITE_LINKEDIN_CLIENT_ID="your-linkedin-client-id"
```

**3. Deploy**
```bash
vercel --prod
```

Production URL: `https://saber-admin-dashboard.vercel.app`

---

## Testing

### Performance Benchmark

```bash
npx tsx scripts/benchmark.ts
```

**Output includes:**
- Response times for all major endpoints
- Status codes and error rates
- Response data previews
- Average latency across all tests

**Sample Output:**
```
[Recruiter] GET /health                        | Status: 200 | Time: 45ms
[Recruiter] GET /auth/me                       | Status: 200 | Time: 250ms
[Recruiter] GET /recruiters/company            | Status: 200 | Time: 230ms
[Recruiter] GET /recruiters/feed               | Status: 200 | Time: 220ms
[Candidate] GET /jobs/feed                     | Status: 200 | Time: 218ms

Average Response Time: 443ms
```

---

## Contributing

**1. Fork the repository**

**2. Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

**3. Commit your changes**
```bash
git commit -m 'Add: your feature description'
```

**4. Push to the branch**
```bash
git push origin feature/your-feature-name
```

**5. Open a Pull Request**

---

## License

This project is licensed under the MIT License.

---

## Acknowledgments

- **Neon** - Serverless PostgreSQL hosting
- **Upstash** - Redis caching infrastructure
- **Vercel** - Edge-optimized deployment platform
- **Cloudinary** - Image CDN and transformation
- **Prisma** - Next-generation ORM
- **TanStack Query** - Powerful async state management

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

**Live Demo:** [https://saber-admin-dashboard.vercel.app](https://saber-admin-dashboard.vercel.app)

**API Health:** [https://saber-api-backend.vercel.app/health](https://saber-api-backend.vercel.app/health)

---

<p align="center">
  Built for the future of intent-driven career matching
</p>
