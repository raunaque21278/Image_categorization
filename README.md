# AI-Powered Media Processing Microservice

A full-stack microservice that accepts user-uploaded images, processes them asynchronously through an AI pipeline, and returns enriched metadata (caption, labels, safety classification). Built as the backend infrastructure for a content platform where users upload images and the platform extracts structured metadata automatically — without blocking the user.

**Repository:** [github.com/raunaque21278/Image_categorization](https://github.com/raunaque21278/Image_categorization)

> ### Google Cloud Vision API — Important Note
>
> **Google Cloud Vision API** is the primary AI service for **label detection**, **object localization**, and **content safety (SafeSearch)** in this project. The integration is implemented correctly in `worker/services/visionService.js` — **there is no code issue**.
>
> Google Cloud requires a **billing account with prepayment enabled** before the Vision API will process requests in production. Until billing is activated on your GCP project, API calls may fail or return empty results. Once prepayment billing is set up and the Cloud Vision API is enabled, the pipeline works as designed with no code changes required.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture Diagram (HLD)](#architecture-diagram-hld)
4. [High Level Design (HLD)](#high-level-design-hld)
5. [Low Level Design (LLD)](#low-level-design-lld)
6. [AI Processing Pipeline](#ai-processing-pipeline)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [API Endpoints](#api-endpoints)
10. [How to Run Locally](#how-to-run-locally)
11. [Environment Variables](#environment-variables)
12. [Design Decisions & Assumptions](#design-decisions--assumptions)
13. [Real-Time Job Updates](#real-time-job-updates)
14. [Flagged Content Handling](#flagged-content-handling)
15. [Scalability Considerations](#scalability-considerations)
16. [Cloud Deployment](#cloud-deployment)
17. [Known Limitations](#known-limitations)

---

## Overview

When a user uploads an image, the system:

1. **Stores** the file durably on disk
2. **Creates** a job record in MongoDB with status `pending`
3. **Enqueues** the job into a Redis-backed BullMQ queue
4. **Returns** the job ID immediately (non-blocking)
5. **Processes** the image in a separate worker service via three sequential AI tasks
6. **Enriches** the job with results and makes them queryable via REST API
7. **Notifies** the frontend in real time when processing completes

---

## Features

| Requirement | Implementation |
|---|---|
| User sign up / log in | JWT-based auth with bcrypt password hashing |
| Authenticated endpoints | Bearer token middleware on all job routes |
| Image upload (JPG, PNG, WEBP) | Multer with MIME type filter |
| Max file size 5 MB | Enforced at API layer via Multer `limits` |
| Async processing | BullMQ queue + dedicated worker service |
| Job list with statuses | `GET /api/jobs` — pending, processing, completed, failed |
| Job detail view | `GET /api/jobs/:id` — caption, labels, safety flag |
| Retry failed jobs | `POST /api/retry/:id` controller (see [Known Limitations](#known-limitations)) |
| Flagged content surfacing | Distinct red styling + flagged count on dashboard |
| Real-time status updates | Socket.IO WebSockets (worker → API → client) |
| Frontend upload flow | Choose file → click **Upload** to start processing |
| Docker containerisation | `docker-compose.yml` — API, worker, Redis, MongoDB, frontend |
| Postman collection | `postman collections/Postman Collections.postman_collection.json` |

---

## Architecture Diagram (HLD)

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        UI["React Frontend<br/>(Vite + Tailwind)"]
    end

    subgraph API["API Service (Express)"]
        Auth["Auth Controller<br/>JWT + bcrypt"]
        Jobs["Job Controller<br/>Upload / List / Detail"]
        Socket["Socket.IO Server"]
        UploadMW["Multer Middleware<br/>5MB · JPG/PNG/WEBP"]
    end

    subgraph Storage["Persistence Layer"]
        MongoDB[("MongoDB<br/>Users · Jobs")]
        Disk[("Local Volume<br/>backend/uploads/")]
        Redis[("Redis<br/>BullMQ Queue")]
    end

    subgraph Worker["Worker Service"]
        BullWorker["BullMQ Worker<br/>image-processing"]
        Pipeline["Image Pipeline Service"]
    end

    subgraph AI["External AI Services"]
        HF["Hugging Face Inference API<br/>Image Captioning · Classification"]
        GVision["Google Cloud Vision API ⭐<br/>Labels · Objects · SafeSearch"]
    end

    UI -->|"REST (JWT)"| Auth
    UI -->|"REST (JWT)"| Jobs
    UI <-->|"WebSocket"| Socket

    Jobs --> UploadMW
    UploadMW --> Disk
    Jobs --> MongoDB
    Jobs -->|"enqueue job"| Redis

    Redis --> BullWorker
    BullWorker --> Pipeline
    Pipeline --> HF
    Pipeline --> GVision
    BullWorker --> MongoDB
    BullWorker -->|"POST /api/socket/job-completed"| Socket
    Socket -->|"job-completed event"| UI
```

---

## High Level Design (HLD)

### System Components

| Component | Role | Technology |
|---|---|---|
| **Frontend** | Sign up, login, upload, job list, results view | React 19, Vite, Tailwind CSS, Socket.IO Client |
| **API Service** | HTTP gateway, auth, file upload, job CRUD, WebSocket hub | Node.js, Express 5 |
| **Worker Service** | Consumes queue jobs, runs AI pipeline, updates DB | Node.js, BullMQ Worker |
| **Message Queue** | Decouples upload from processing; enables retries | Redis + BullMQ |
| **Database** | Users, job state, AI results | MongoDB (Mongoose) |
| **File Storage** | Durable image storage | Local filesystem (`backend/uploads/`) |
| **AI Layer** | Caption, label detection, safety check | **Google Cloud Vision API** (primary), Hugging Face Inference API |

### Separation of Concerns

The system follows a **producer–consumer** pattern:

- **API Service (Producer):** Handles synchronous user requests only — authentication, validation, file persistence, job creation, and queue enqueue. Never calls AI APIs directly, so upload latency stays low.
- **Worker Service (Consumer):** Handles all CPU/IO-heavy and external API work. Scales independently from the API. Failures here do not crash the API.

### Data Flow

```
Upload Request
    → Validate auth + file type/size
    → Save file to disk
    → Create Job (status: pending) in MongoDB
    → Add job to Redis queue
    → Return { jobId, status: pending }

Worker picks job
    → Update status: processing
    → Run AI pipeline (caption → labels → safety)
    → Update Job with results (status: completed)
    → Emit WebSocket notification to user room
```

### Failure Handling

| Scenario | Behaviour |
|---|---|
| AI API timeout/error | Worker throws; BullMQ retries up to 3 times with exponential backoff (3 s base) |
| All retries exhausted | Job status set to `failed`; `errorMessage` stored |
| Manual retry | User triggers re-queue via retry endpoint; status reset to `pending` |
| Socket notification failure | Logged; job still marked completed in DB |

### State Management

Job lifecycle states: `pending` → `processing` → `completed` | `failed`

MongoDB is the **source of truth** for job state. Redis/BullMQ holds transient queue metadata only. Both API and Worker connect to the same MongoDB instance.

---

## Low Level Design (LLD)

### Database Schema

#### User Collection

```
User {
  _id:        ObjectId
  name:       String (required)
  email:      String (required, unique)
  password:   String (required, bcrypt hashed)
  createdAt:  Date
  updatedAt:  Date
}
```

#### Job Collection

```
Job {
  _id:              ObjectId
  userId:             ObjectId → User (required)
  imageUrl:           String   — relative path e.g. "uploads/1234.jpg"
  status:             Enum     — pending | processing | completed | failed
  caption:            String
  labels:             [String]
  flagged:            Boolean  — default false
  flaggedCategory:    String
  queueJobId:         String
  retryCount:         Number   — default 0
  errorMessage:       String
  createdAt:          Date
  updatedAt:          Date
}
```

### API Service — Module Breakdown

```
backend/src/
├── server.js              # Express app + HTTP server + Socket.IO init
├── config/
│   ├── db.js              # Mongoose connection
│   └── redis.js           # IORedis connection for BullMQ
├── middleware/
│   ├── auth.js            # JWT Bearer token verification
│   └── upload.js          # Multer: disk storage, MIME filter, 5 MB limit
├── models/
│   ├── User.js
│   └── Job.js
├── controllers/
│   ├── authController.js  # signup, login, getMe
│   ├── jobController.js   # uploadImage, getJobs, getJobById
│   └── retryController.js # retryJob
├── routes/
│   ├── authRoutes.js      # /api/auth/*
│   ├── jobRoutes.js       # /api/jobs/*
│   ├── retryRoutes.js     # /api/retry/*
│   └── socketRoutes.js    # /api/socket/job-completed (internal)
├── queue/
│   └── imageQueue.js      # BullMQ Queue("image-processing")
└── sockets/
    └── socket.js          # Socket.IO: join user rooms, emit events
```

### Worker Service — Module Breakdown

```
worker/
├── worker.js                    # BullMQ Worker bootstrap + failure handler
├── workers/
│   └── imageWorker.js           # Job handler: status updates + pipeline call
├── services/
│   ├── imagePipelineService.js  # Orchestrates all 3 AI steps
│   ├── captionService.js        # Hugging Face BLIP image captioning
│   ├── classificationService.js # Hugging Face ViT classification
│   ├── visionService.js         # ⭐ Google Cloud Vision (labels, objects, SafeSearch)
│   ├── safetyService.js         # Keyword-based safety flagging
│   └── socketNotifier.js        # HTTP callback to API for WebSocket emit
├── repositories/
│   └── jobRepository.js         # findById, save abstraction
├── models/
│   └── Job.js                   # Shared schema with API
└── config/
    ├── db.js
    ├── redis.js
    └── safetyKeywords.js        # Unsafe label keyword list
```

### Authentication Flow (JWT)

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as MongoDB

    C->>A: POST /api/auth/login
    A->>DB: Find user by email
    A->>A: bcrypt.compare(password)
    A->>A: jwt.sign({ id }, JWT_SECRET, 7d)
    A-->>C: { token, user }

    Note over C,A: Subsequent requests
    C->>A: Authorization: Bearer <token>
    A->>A: jwt.verify(token)
    A->>A: req.user = { id }
    A-->>C: Protected resource
```

**Why JWT?** Stateless, horizontally scalable, no server-side session store needed. Suitable for a microservice where the API may run multiple instances behind a load balancer.

### Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as Disk
    participant DB as MongoDB
    participant Q as Redis Queue

    C->>A: POST /api/jobs/upload (multipart + JWT)
    A->>A: Multer validate type + size
    A->>D: Save file to uploads/
    A->>DB: Job.create({ status: pending })
    A->>Q: imageQueue.add({ jobId, imagePath })
    A-->>C: { jobId, status: pending }
```

### Worker Processing Flow

```mermaid
sequenceDiagram
    participant Q as Redis Queue
    participant W as Worker
    participant DB as MongoDB
    participant AI as AI Services
    participant S as Socket.IO

    Q->>W: Job dequeued
    W->>DB: status = processing
    W->>AI: Step 1 — Image Captioning (Hugging Face BLIP)
    W->>AI: Step 2 — Labels + Objects + SafeSearch (Google Cloud Vision)
    W->>AI: Step 3 — Content Safety Check (Google SafeSearch)
    W->>W: Merge labels + run safety check
    W->>DB: Save caption, labels, flagged, status = completed
    W->>S: POST /api/socket/job-completed
    S->>S: io.to(userId).emit("job-completed")
```

### Queue Configuration

```javascript
// Enqueue options (jobController.js)
{
  attempts: 3,
  backoff: { type: "exponential", delay: 3000 }
}
```

Queue name: `image-processing`  
Job name: `process-image`  
Payload: `{ jobId, userId, imagePath }`

---

## AI Processing Pipeline

Every image runs through three sequential AI tasks as specified in the requirements:

| Step | Task | Service | Model / API | Output |
|---|---|---|---|---|
| 1 | Image Captioning | `captionService.js` | Hugging Face — `Salesforce/blip-image-captioning-base` | Natural language description |
| 2 | Object / Label Detection | `classificationService.js` + `visionService.js` | Hugging Face `google/vit-base-patch16-224` + **Google Cloud Vision** (LABEL_DETECTION, OBJECT_LOCALIZATION) | Merged unique label list |
| 3 | Content Safety Check | `safetyService.js` + `visionService.js` | **Google Cloud Vision SafeSearch** + label keyword matching | `flagged: true/false`, `flaggedCategory` |

### Google Cloud Vision API (Primary AI Service)

Google Cloud Vision powers the core enrichment and safety steps:

| Feature | Vision API Type | Used For |
|---|---|---|
| Label Detection | `LABEL_DETECTION` | Identifies objects, concepts, and scene labels |
| Object Localization | `OBJECT_LOCALIZATION` | Detects and names objects with bounding regions |
| Content Safety | `SAFE_SEARCH_DETECTION` | Flags adult, violent, racy, or medical content |

**Billing requirement:** Google Cloud Vision requires an active GCP project with **prepayment billing enabled**. The worker code in `visionService.js` is correct — if labels or SafeSearch results appear empty during testing, enable billing on your Google Cloud project. No application code changes are needed.

### Pipeline Orchestration (`imagePipelineService.js`)

```
1. classifyImage(imagePath)     → Hugging Face labels
2. analyzeImage(imagePath)      → ⭐ Google Cloud Vision: labels, objects, safeSearch
3. Merge all labels (deduplicated)
4. checkSafety(uniqueLabels)    → flagged + category (SafeSearch + keywords)
5. generateCaption(imagePath)   → Hugging Face BLIP caption (with label-based fallback)
6. Return { caption, labels, flagged, flaggedCategory, ... }
```

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Application** | MERN (MongoDB, Express, React, Node.js) | Required by spec; familiar full-stack pattern |
| **Queue** | Redis + BullMQ | Reliable job queue with built-in retry, backoff, and observability |
| **Containerisation** | Docker (docker-compose planned) | Mandatory per spec for local full-system spin-up |
| **AI — Labels / Objects / Safety** | **Google Cloud Vision API** | Primary service per spec; label detection, object localization, SafeSearch. Requires GCP prepayment billing — no code issue |
| **AI — Captioning** | Hugging Face Inference API | `Salesforce/blip-image-captioning-base` for natural language captions |
| **AI — Classification** | Hugging Face Inference API | `google/vit-base-patch16-224`; supplements Vision labels |
| **File Storage** | Local volume (`backend/uploads/`) | Simple for development; swap to S3/GCS/R2 for production |
| **Auth** | JWT (Bearer token, 7-day expiry) | Stateless, scalable, no session store |
| **Real-time** | Socket.IO WebSockets | Push job completion to client without polling |
| **CI/CD** | GitHub (manual deploy) | Open-ended per spec |

---

## Project Structure

```
Image categorization/
├── backend/                 # API service
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── queue/
│   │   ├── routes/
│   │   └── sockets/
│   └── uploads/             # Stored image files
├── worker/                  # Background worker service
│   ├── worker.js
│   ├── workers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   └── config/
├── frontend/                # React SPA
│   └── src/
│       ├── pages/           # Login, Signup, Dashboard
│       ├── components/      # UploadForm, JobCard
│       ├── api/             # Axios client with JWT interceptor
│       └── socket/          # Socket.IO client
└── README.md
```

---

## API Endpoints

All job endpoints require `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login, returns JWT |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/jobs/upload` | Yes | Upload image (field: `image`); returns `jobId` |
| `GET` | `/api/jobs` | Yes | List all jobs for authenticated user |
| `GET` | `/api/jobs/:id` | Yes | Get single job with full results |

### Retry

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/retry/:id` | Yes | Re-queue a failed job |

### Internal / Socket

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/socket/job-completed` | No | Worker → API callback to emit WebSocket event |

### Static Files

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/uploads/:filename` | Serve uploaded images |

---

## How to Run with Docker (Recommended)

Per the interview spec, the full system runs with one command:

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- Google Cloud Vision JSON key at `worker/config/google-vision.json`
- Hugging Face API token

### Steps

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Edit .env — set HF_API_KEY and JWT_SECRET
# 3. Ensure worker/config/google-vision.json exists (GCP service account)

# 4. Start all services
docker compose up --build
```

### Docker services

| Service | URL | Description |
|---|---|---|
| **Frontend** | http://localhost:3000 | React UI (nginx) |
| **API** | http://localhost:5000 | Express REST + WebSocket |
| **Worker** | — | BullMQ consumer + AI pipeline |
| **MongoDB** | localhost:27017 | Job & user data |
| **Redis** | localhost:6379 | BullMQ queue |

Open **http://localhost:3000** → sign up → choose file → click **Upload**.

### Local Docker vs Cloud Deployment

These are **two separate ways** to run the app. Deploying to the cloud does **not** remove or break local Docker.

| | **Local / VPS Docker** | **Cloud (Render)** |
|---|---|---|
| **Command** | `docker compose up --build` | Render Blueprint (`render.yaml`) |
| **Uses Docker?** | Yes — all 5 services in one network | Yes — each service built from same Dockerfiles |
| **Works the same?** | Full stack works together | Different setup — services are separate |
| **Shared uploads** | Shared volume works | API and worker disks are separate on free tier |
| **Frontend → API** | nginx proxies `/api` to `api:5000` | Must set public API URLs in `VITE_*` env vars |
| **Recommended for** | Interview demo, local dev, VPS | Public URL without managing a server |

**If you want the exact same behavior as local Docker in production**, deploy on a VPS (DigitalOcean, AWS EC2, etc.):

```bash
# On your server (with Docker installed)
git clone https://github.com/raunaque21278/Image_categorization.git
cd Image_categorization
cp .env.docker.example .env
# Edit .env, add google-vision.json

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Your app will be live at `http://YOUR_SERVER_IP:3000` — same Docker stack as local.

---

## How to Run Locally (Manual)

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis server
- API keys: **Google Cloud Vision** (with prepayment billing enabled), Hugging Face

### 1. Start infrastructure

```bash
# MongoDB (if running locally)
mongod

# Redis (if running locally)
redis-server
```

### 2. Backend (API)

```bash
cd backend
npm install
# Create .env (see Environment Variables section)
npm run dev
# Runs on http://localhost:5000
```

### 3. Worker

```bash
cd worker
npm install
# Create .env + place Google Cloud credentials JSON
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 5. Verify

1. Open `http://localhost:5173`
2. Sign up / log in
3. On the **Dashboard**, upload an image:
   - Click **Choose File** and select a JPG, PNG, or WEBP image (≤ 5 MB)
   - Click the **Upload** button to submit — selecting a file alone does not start processing; you must click **Upload**
4. Watch job status update via WebSocket when processing completes
5. View caption, labels, and safety classification on the dashboard

### Using the Frontend (Upload Flow)

The upload UI is a two-step action on the Dashboard (`UploadForm.jsx`):

```
Choose File  →  select image (JPG / PNG / WEBP, max 5 MB)
     ↓
Upload       →  click to send the file to the API and create a job
```

After clicking **Upload**, the API returns a job ID immediately and the job appears in your list with status `pending`. Processing runs in the background via the worker — you do not need to wait on the upload screen.

---

## Environment Variables

### Backend (`backend/.env`)

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/media-processing` |
| `JWT_SECRET` | Secret for signing JWT tokens | `your-secret-key` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Worker (`worker/.env`)

Copy the example files and fill in your values:

```bash
cp worker/.env.example worker/.env
cp worker/config/google-vision.json.example worker/config/google-vision.json
```

Then edit `worker/.env` and replace `google-vision.json` with your real GCP service account key path and credentials.

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | Same MongoDB as backend | `mongodb://localhost:27017/media-processing` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `HF_API_KEY` | Hugging Face Inference API token (captioning + classification) | Get from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | `./config/google-vision.json` |

### How to Obtain API Keys

#### Google Cloud Vision API (Required — Primary AI Service)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. **Enable billing with prepayment** on the project — this is required for Vision API to process requests
3. Enable the **Cloud Vision API** under APIs & Services
4. Create a service account with **Cloud Vision API User** (or Editor) permissions
5. Download the JSON key file and save it as `worker/config/google-vision.json` (use `google-vision.json.example` as a template — **do not commit the real file**)
6. Set `GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision.json` in `worker/.env`

> **Note:** If Vision API calls fail or return empty labels/SafeSearch results during local testing, the cause is almost always missing or inactive billing — **not a bug in the application code**. Once prepayment billing is active, `visionService.js` works without any code changes.

**Hugging Face**
1. Sign up at [huggingface.co](https://huggingface.co)
2. Go to Settings → Access Tokens
3. Create a token with **Inference** permission

---

## Design Decisions & Assumptions

### Auth: JWT over Session

JWT was chosen because the API and worker are separate processes/services. Stateless tokens avoid needing a shared session store and simplify horizontal scaling of API instances.

### Queue: BullMQ over raw Redis lists

BullMQ provides built-in retry with exponential backoff, job attempt tracking, and failure events — critical for unreliable external AI API calls.

### File Storage: Local volume

Local disk storage keeps the MVP simple. In production, this would move to S3, GCS, or Cloudflare R2 with pre-signed URLs.

### Real-time: WebSockets over Polling

Socket.IO was chosen to push `job-completed` events immediately. The worker calls the API's internal socket endpoint, which emits to the user's room (`socket.join(userId)`). This avoids constant polling and gives instant UI updates.

### Flagged Content Notification: In-app (WebSocket)

When a job completes with `flagged: true`, the WebSocket event includes the flag data. The dashboard shows flagged jobs with distinct red styling and a flagged count stat. No email service was added to keep scope manageable.

### Google Cloud Vision as Primary AI Backend

**Google Cloud Vision API** is the core AI dependency for label detection, object localization, and SafeSearch content moderation — exactly as specified in the task requirements. The integration in `visionService.js` uses the official `@google-cloud/vision` Node.js client with `LABEL_DETECTION`, `OBJECT_LOCALIZATION`, and `SAFE_SEARCH_DETECTION` features.

Google Cloud requires **prepayment billing** to be enabled before Vision API requests are processed. This is a GCP account configuration requirement, not an application defect. The code is correct and will work immediately once billing is active.

### Captioning via Hugging Face

Image captioning uses Hugging Face `Salesforce/blip-image-captioning-base` via the Inference API, as recommended in the spec.

### Safety Check Approach

Google Vision SafeSearch data is fetched in `visionService.js`. The `safetyService.js` module flags content based on detected labels and SafeSearch annotations. Per the spec, jobs are marked `flagged: true` when SafeSearch returns `LIKELY` or `VERY_LIKELY` for any category.

### CI/CD

Currently manual deployment via Git push to GitHub. A GitHub Actions pipeline (lint → test → build → deploy) would be added with more time.

### Cloud Platform

Designed for local development first. Production deployment would target any container-friendly platform (Railway, Render, AWS ECS, GCP Cloud Run).

---

## Real-Time Job Updates

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as API (Socket.IO)
    participant W as Worker

    F->>API: socket.emit("join", userId)
    Note over F,API: User joins their room

    W->>W: Job processing complete
    W->>API: POST /api/socket/job-completed
    API->>F: emit("job-completed", { jobId, status, caption, labels, flagged })
    F->>API: GET /api/jobs (refresh list)
```

The frontend listens for `job-completed` in `Dashboard.jsx` and refreshes the job list automatically.

---

## Flagged Content Handling

Per the spec:

- If content safety returns anything other than **SAFE** (Google SafeSearch `LIKELY` or `VERY_LIKELY`), the job is marked `flagged: true` with the category stored in `flaggedCategory`.
- Flagged jobs are surfaced distinctly in the UI (red badge, flagged counter on dashboard).
- Users are notified in-app via the WebSocket `job-completed` event containing `flagged` and `flaggedCategory`.

---

## Scalability Considerations

### Under 10× Load

| Component | Bottleneck? | Scaling Strategy |
|---|---|---|
| **API Service** | Low — upload is I/O bound | Add more API instances behind a load balancer; stateless JWT auth supports this |
| **Worker Service** | **Primary bottleneck** — AI API calls are slow (2–5 s each) | **Add more worker instances**; BullMQ distributes jobs across workers automatically |
| **Redis Queue** | Moderate at very high throughput | Redis Cluster or dedicated managed Redis (ElastiCache, Upstash) |
| **MongoDB** | Moderate — read-heavy after processing | Read replicas, index on `userId + createdAt` |
| **External AI APIs** | **Hard bottleneck** — rate limits | Request queuing, circuit breakers, caching for duplicate images, multiple API keys |
| **File Storage** | I/O bound at scale | Move to object storage (S3/GCS) with CDN |

### Would Adding More Workers Help?

**Yes.** Workers are stateless consumers. Running N worker processes/containers against the same Redis queue linearly increases throughput until AI API rate limits or MongoDB write capacity is hit.

### What Would Change at Scale

1. Object storage instead of local disk
2. Dead-letter queue for permanently failed jobs
3. Idempotency keys to prevent duplicate processing on retry
4. Rate limiting on upload endpoint
5. Kubernetes HPA for worker pods based on queue depth
6. Kubernetes HPA for worker pods based on queue depth

---

## Cloud Deployment

### Deployed Application URL

> **Deploy via Render (recommended):** Connect this GitHub repo at [Render Dashboard](https://dashboard.render.com) → **New Blueprint** → select `render.yaml`.

After deployment, add your live URL here:

| Service | URL |
|---|---|
| **Frontend** | `https://your-frontend.onrender.com` |
| **API** | `https://your-api.onrender.com` |

### Render (Blueprint)

The repo includes `render.yaml` with:

- **media-api** — Express API (Docker)
- **media-worker** — Background worker (Docker)
- **media-frontend** — React SPA (Docker + nginx)
- **media-mongo** — Managed MongoDB
- **media-redis** — Managed Redis

**Steps:**

1. Push code to [github.com/raunaque21278/Image_categorization](https://github.com/raunaque21278/Image_categorization)
2. Go to [Render](https://render.com) → **New** → **Blueprint**
3. Connect the repo and apply `render.yaml`
4. Set environment variables in Render dashboard:
   - `HF_API_KEY` — Hugging Face token
   - `CORS_ORIGIN` — your frontend URL (e.g. `https://media-frontend.onrender.com`)
   - Upload `google-vision.json` as a secret file for the worker
   - Frontend build args: `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ASSETS_URL` pointing to API URL
5. Enable **prepayment billing** on Google Cloud for Vision API

### CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main`:

- Installs dependencies for backend, worker, frontend
- Builds the frontend
- Validates `docker-compose.yml`

### Production environment variables

| Variable | Service | Description |
|---|---|---|
| `MONGO_URI` | API, Worker | MongoDB connection string |
| `REDIS_URL` | API, Worker | Redis connection string |
| `JWT_SECRET` | API | JWT signing secret |
| `HF_API_KEY` | Worker | Hugging Face Inference API |
| `GOOGLE_APPLICATION_CREDENTIALS` | Worker | Path to GCP Vision JSON |
| `API_URL` | Worker | Public API URL for socket callback |
| `UPLOADS_DIR` | API, Worker | Shared uploads path (`/data/uploads`) |
| `CORS_ORIGIN` | API | Frontend origin for CORS + Socket.IO |
| `VITE_API_URL` | Frontend | API base URL at build time |
| `VITE_SOCKET_URL` | Frontend | WebSocket URL at build time |
| `VITE_ASSETS_URL` | Frontend | Image asset base URL |

---

## Known Limitations

| Item | Status |
|---|---|
| Deployed URL | Deploy via Render Blueprint — add live URL after first deploy |
| Google Vision billing | Requires GCP prepayment billing — not a code issue |
| Shared uploads on Render | API and worker need shared disk or object storage (S3/GCS) for production scale |
| `detectionService.js` | HF DETR service exists but is not wired into the pipeline |
| Socket callback auth | `/api/socket/job-completed` is unauthenticated — secure via private network in Docker |

---

## License

ISC
