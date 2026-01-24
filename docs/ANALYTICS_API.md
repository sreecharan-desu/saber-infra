# Analytics API Documentation

## Overview

This API provides high-level statistics and breakdown metrics for both Candidates and Recruiters to populate their respective dashboards.

---

## 1. Candidate Analytics

**Endpoint:** `GET /analytics/candidate`  
**Auth:** Required (`Bearer <token>`)  
**Role:** `candidate`

### Description

Fetches aggregated statistics for the logged-in candidate, including job search activity and profile visibility.

### Response Body

```json
{
  "total_matches": 12,
  "total_applications": 45,
  "applications_breakdown": [
    {
      "status": "pending",
      "count": 30
    },
    {
      "status": "reviewing",
      "count": 10
    },
    {
      "status": "interview",
      "count": 4
    },
    {
      "status": "rejected",
      "count": 1
    }
  ],
  "swipes_made": 150,
  "profile_views": 85
}
```

### Fields

- **total_matches**: Number of mutual matches with jobs.
- **total_applications**: Total active applications (excluding withdrawn).
- **applications_breakdown**: Array of application counts grouped by status. Useful for Pie Charts or Funnels.
- **swipes_made**: Total number of jobs the candidate has swiped 'Right' on.
- **profile_views**: The number of times a recruiter successfully swiped (left or right) on this candidate's profile.

---

## 2. Recruiter Analytics

**Endpoint:** `GET /analytics/recruiter`  
**Auth:** Required (`Bearer <token>`)  
**Role:** `recruiter` (or `admin`)

### Description

Fetches aggregated metrics across **all active jobs** managed by the recruiter.

### Response Body

```json
{
  "active_jobs": 3,
  "total_applications": 120,
  "total_matches": 15,
  "total_views": 500,
  "pipeline": [
    {
      "status": "pending",
      "count": 80
    },
    {
      "status": "reviewing",
      "count": 30
    },
    {
      "status": "interview",
      "count": 8
    },
    {
      "status": "accepted",
      "count": 2
    }
  ]
}
```

### Fields

- **active_jobs**: Count of currently active job postings.
- **total_applications**: Total applications received across all jobs.
- **total_matches**: Total mutual matches created.
- **total_views**: Total number of candidates who viewed/swiped on the recruiter's jobs.
- **pipeline**: Breakdown of all applicants by their current status. This represents the overall hiring funnel.

---

## Frontend Integration Prompt

**Context:**
We need to visualize these metrics on the user dashboards using **Recharts** (or Chart.js) and **Tailwind CSS**. The design should be minimalist, professional, and consistent with the Vercel/Geist design system.

### Prompt for Frontend Developer (AI):

```markdown
**Task:** Implement Analytics Dashboards for Candidate and Recruiter.

**Tech Stack:** React, Recharts, Tailwind CSS, Axios, Lucide React (for icons).

**1. Candidate Dashboard (`/candidate/dashboard`):**

- **Fetch Data:** `GET /api/analytics/candidate`
- **UI Components:**
  - **Stats Row:** Display 4 cards with icons for: `Matches`, `Applications`, `Profile Views`, `Swipes Made`.
  - **Application Status Chart:** Use a **Donut Chart** (`Recharts <PieChart>`) to visualize `applications_breakdown`.
    - Colors: Pending (Gray), Reviewing (Blue), Interview (Purple), Accepted (Green), Rejected (Red).
    - Legend: Display status names and counts on the right.
- **Style:** Use rounded corners (`rounded-xl`), subtle borders (`border-neutral-200`), and a clean white/gray background.

**2. Recruiter Dashboard (`/recruiter/dashboard`):**

- **Fetch Data:** `GET /api/analytics/recruiter`
- **UI Components:**
  - **Overview Cards:** Display `Active Jobs`, `Total Views`, `Total Applications`, `Matches`.
  - **Hiring Funnel:** Use a **Bar Chart** (`Recharts <BarChart>`) to visualize the `pipeline` array.
    - X-Axis: Status (Pending -> Reviewing -> Interview -> Accepted).
    - Y-Axis: Count.
    - Tooltip: Custom minimalist tooltip.
  - **Conversion Rate Card:** Calculate and display "View to Application Rate" (`total_applications / total_views * 100`) as a percentage with a progress bar.

**Requirements:**

- Handle loading states with Skeleton loaders.
- Handle empty states (e.g., "No data yet" illustration).
- Ensure the graphs are responsive.
```
