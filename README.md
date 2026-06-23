# ResearchPulse

Real-time academic research intelligence platform — API, React frontend, and an embeddings microservice.

---

## Table of Contents
- Project overview
- Tech stack
- Architecture (diagram)
- Features
- Repo layout
- Environment variables (full)
- Local development (detailed)
- Docker & docker-compose (complete examples)
- Production deployment (step-by-step)
- CI/CD example (GitHub Actions)
- Kubernetes (manifests + guidance)
- Scaling, monitoring & observability
- Security & secrets management
- Backups & disaster recovery
- Troubleshooting & diagnostics
- Next steps

---

## Project overview

ResearchPulse aggregates academic papers, provides semantic search, AI-generated summaries, trends and recommendations, and real-time notifications. The repository contains three main components:

- Backend API: `backend` (Node.js/Express)
- Frontend: `frontend` (React + Vite)
- Embedding service: `embedding-service` (Python Flask + sentence-transformers)

This README documents the tech stack, architecture, environment variables, local development, and recommended deployment approaches.

## Tech stack

- Backend: Node.js (ESM), Express, Mongoose (MongoDB), BullMQ + ioredis (background jobs), Socket.IO (real-time), Winston (logging), Swagger (API docs)
- Frontend: React 18, Vite, Recharts, Redux Toolkit, React Router
- Embedding service: Python Flask, sentence-transformers, PyTorch
- Datastores: MongoDB (primary), Redis (queues & cache)
- Optional AI: Google Gemini via `@google/generative-ai` SDK (app supports mock fallback)
- Dev / infra: Docker, Docker Compose, GitHub Actions (recommended)

## Architecture

High level:

- Clients (browser) ↔ Frontend (static SPA)
- SPA ↔ Backend API over REST & WebSockets (Socket.IO)
- Backend ↔ MongoDB for persistent storage
- Backend ↔ Redis for BullMQ queues, cache, and Socket.IO adapter (if scaled)
- Backend ↔ Embedding microservice (HTTP) for vector generation
- Backend ↔ Gemini API (optional) for generative summaries
- Background workers (BullMQ) perform ingestion, embeddings, AI summarization, and indexing

Components in repo:

- `backend/src/index.js` — app entry, scheduler, server + graceful shutdown
- `backend/src/app.js` — Express app and routes
- `backend/src/services/embeddingService.js` — HTTP client to embedding-service
- `embedding-service/app.py` — Flask service exposing `/embed` endpoints

For production-scale deployments consider splitting components across separate containers or services, using managed MongoDB and Redis, and placing the embedding service on a node with adequate RAM / GPU if needed.

### Architecture diagram

```mermaid
flowchart LR
  Browser-->CDN[CDN / Static Hosting]
  CDN-->Frontend[Frontend (static files - Vite build served by nginx or CDN)]
  Frontend-->LB[Load Balancer]
  LB-->API1[Backend API replica 1]
  LB-->API2[Backend API replica 2]
  API1-->Mongo[(MongoDB)]
  API2-->Mongo
  API1-->Redis[(Redis)]
  API2-->Redis
  API1-->Embedding[Embedding Service]
  Workers[Worker replicas]-->Redis
  Workers-->Mongo
  Embedding-->VectorStore[(Optional Vector DB)]
```

## Features

- Semantic search and recommendations
- AI-generated paper summaries and research-gap detection (Gemini integration with mock fallback)
- Background ingestion pipeline with BullMQ and Redis
- Real-time updates via Socket.IO
- Authentication + JWT
- API documentation via Swagger at `/api/docs`

## Repo layout (top-level)

- `backend/` — Node backend, `src/`, `package.json`
- `frontend/` — React app (Vite), `src/`, `package.json`
- `embedding-service/` — Python Flask embedding microservice, `requirements.txt`

## Environment variables

Create a `.env` for local development (do NOT commit secrets). The backend and supporting services use the following environment variables.

Core variables:

- `PORT` — backend HTTP port (default `5000`).
- `NODE_ENV` — `development` or `production`.
- `LOG_LEVEL` — `debug|info|warn|error` for Winston.

Database & cache:

- `MONGO_URI` — MongoDB connection string (example: `mongodb://mongo:27017/research_pulse`).
- `REDIS_URL` — Redis connection string (example: `redis://redis:6379`).

Security & integrations:

- `JWT_SECRET` — cryptographically-secure random string used to sign JWTs (REQUIRED in production).
- `GEMINI_API_KEY` — optional Google Generative AI key. If absent or invalid, the app uses intelligent mock fallbacks.
- `EMBEDDING_SERVICE_URL` — URL of the embedding microservice (default: `http://localhost:5001`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP credentials for email notifications.

Advanced / optional:

- `SENTRY_DSN` — if integrating Sentry for error reporting.
- `VECTOR_DB_URL` — optional vector DB endpoint (Pinecone/Weaviate/Milvus) if used.

Example local `.env` (development):

```
PORT=5000
NODE_ENV=development
LOG_LEVEL=debug
MONGO_URI=mongodb://127.0.0.1:27017/research_pulse
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_secure_random
EMBEDDING_SERVICE_URL=http://localhost:5001
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=secret
```

For production, store secrets in your environment provider or secrets manager, and do NOT commit them to Git.

## Local development (detailed)

Prerequisites:

- Node.js 18+ and npm
- Python 3.11+ and pip
- Docker & Docker Compose (recommended for local MongoDB/Redis)

Install node dependencies (root helper):

```bash
npm run install-all
```

Install Python dependencies for embedding service

```bash
cd embedding-service
pip install -r requirements.txt
cd ..
```

Tip: `torch` may require a platform-specific wheel. On Windows use the official PyTorch instructions to install the appropriate wheel for CPU/GPU support.

Start infrastructure locally using Docker (quick):

```bash
# Start MongoDB
docker run -d --name pulse_mongo -p 27017:27017 -v pulse_mongo_data:/data/db mongo:6

# Start Redis
docker run -d --name pulse_redis -p 6379:6379 redis:7
```

Start the embedding service

```bash
python embedding-service/app.py
```

Start the backend (dev):

```bash
npm run dev-backend
```

Start the frontend (dev):

```bash
npm run dev-frontend
```

Visit the frontend (Vite): usually `http://localhost:5173`. Backend API: `http://localhost:5000/api`.

Dev tips:

- If you're low on RAM, run the embedding service remote or mock the embedding endpoints by returning fixed vectors.
- Use `nodemon` for automatic backend reloads (already configured in `backend/package.json` as `dev`).

## Docker & docker-compose (recommended)

This repo is ready for containerization. Below are recommended `Dockerfile`s and a full `docker-compose.yml` suitable for local testing. For production, use a container registry and orchestrator (ECS/GKE/EKS).

### Recommended `Dockerfile`s

`backend/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/index.js"]
```

`frontend/Dockerfile` (multi-stage build)

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`embedding-service/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY embedding-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY embedding-service/ ./
EXPOSE 5001
CMD ["python", "app.py"]
```

Notes:
- For `embedding-service`, prefer a base image that already includes PyTorch or use official PyTorch images for GPU support. Installing `torch` in a slim image can be slow and produce large images.

### Example `docker-compose.yml` (local testing)

Save this in the repo root as `docker-compose.yml` for local development. It wires up MongoDB and Redis and starts embedding, backend and frontend containers.

```yaml
version: "3.8"
services:
  mongo:
    image: mongo:6
    restart: unless-stopped
    volumes:
      - pulse_mongo_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7
    restart: unless-stopped
    ports:
      - "6379:6379"

  embedding:
    build:
      context: .
      dockerfile: embedding-service/Dockerfile
    restart: unless-stopped
    ports:
      - "5001:5001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/research_pulse
      - REDIS_URL=redis://redis:6379
      - EMBEDDING_SERVICE_URL=http://embedding:5001
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo
      - redis
      - embedding

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pulse_mongo_data:
```

Run locally:

```bash
# set JWT_SECRET in the shell or a .env file used by docker-compose
export JWT_SECRET=$(openssl rand -hex 32)
docker-compose up --build -d
```

Access:

- Frontend: http://localhost
- Backend: http://localhost:5000/api

Common adjustments for production:

- Replace local `mongo` and `redis` with managed endpoints (MongoDB Atlas, AWS ElastiCache). Update `MONGO_URI` and `REDIS_URL`.
- Use a private VPC/subnet for databases; do not expose Mongo/Redis ports publicly.
- Configure health checks and readiness probes in your orchestrator.

## Production deployment guidance

Recommended pattern for production:

- Frontend: build static assets and serve via CDN (S3 + CloudFront, Netlify, Vercel, or static site on nginx). This reduces load on backend.
- Backend: containerized service deployed to a container hosting solution (AWS ECS Fargate, Google Cloud Run, Azure App Service, or Kubernetes). Use multiple replicas behind a load balancer.
- Worker pool: deploy one or more worker replicas to process BullMQ queues. Workers can be part of the `backend` image but run with a worker entrypoint.
- Embedding service: run as a separate service on a node with sufficient RAM or GPU. Optionally switch to a managed vector/embedding provider.
- Database & cache: use managed MongoDB and managed Redis. Configure backups and automated failover.
- Secrets: store `JWT_SECRET`, `GEMINI_API_KEY`, SMTP credentials in a secret manager (AWS Secrets Manager, GitHub Secrets, or Kubernetes Secrets).

### Step-by-step production checklist

1. Build immutable images and store them in a registry (GHCR, Docker Hub, ECR).
2. Provision managed MongoDB (Atlas) and Redis (ElastiCache/Redis Cloud).
3. Provision a load balancer and container runtime (ECS/GKE/Cloud Run/AKS).
4. Deploy backend replicas and worker replicas separately. Configure auto-scaling rules for CPU/memory and queue backlog.
5. Deploy embedding service on dedicated node pool (high memory or GPU nodes) or use a managed embeddings provider.
6. Use a CDN or static hosting for frontend builds. Use TLS across clients and API.
7. Configure application logging to a centralized system and set up alerts for errors and queue depth.

### Socket.IO and WebSocket scaling

- If you scale backend nodes, use a Socket.IO adapter backed by Redis so events are propagated across nodes.
- Use sticky sessions only if you cannot use a pub/sub adapter, but prefer the Redis adapter.

### Worker topology

- Workers should be stateless; run multiple replicas behind the same Redis queues. Configure concurrency and process limits. Monitor job failure rates and dead-letter queues.

### Embeddings at scale

- For CPU-only embedding service: use machines with large RAM (16–64GB) depending on model size and batch throughput.
- For GPU: select appropriate CUDA images and match PyTorch to driver versions. Consider batching requests to improve throughput.

## CI/CD recommendations

- Build & test pipeline (GitHub Actions) that:
  - Installs dependencies and runs lint/tests for backend & frontend
  - Builds Docker images and pushes to a registry (GHCR, Docker Hub)
  - Optionally deploys images to target environment (ECS/GKE)

- Securely store deploy-time secrets in repo-level or environment-level secret stores.

### Example GitHub Actions workflow (build + push)

Save as `.github/workflows/ci-cd.yml` (example pushes images to GHCR and triggers a deployment step):

```yaml
name: CI

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Build frontend
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - name: Build and push backend image
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/research-pulse-backend:${{ github.sha }}

      - name: Build and push frontend image
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/research-pulse-frontend:${{ github.sha }}

      - name: Build and push embedding image
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/research-pulse-embedding:${{ github.sha }}

      # Optional: deploy step depends on your target provider (ECS, GKE, etc.)
```

Store container registry credentials and deployment credentials in GitHub Secrets.

### Blue/Green or Canary deploys

- Prefer blue/green or canary for zero-downtime deploys. Use infrastructure features (ECS deployments, Kubernetes deployments with rolling updates) or deployment orchestrators.

## Kubernetes (manifests + guidance)

Below are minimal manifest snippets to deploy the `backend` and `worker`. These are examples — adapt resource requests/limits and readiness/liveness probes for your environment.

`backend-deployment.yaml` (snippet):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pulse-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pulse-backend
  template:
    metadata:
      labels:
        app: pulse-backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/<org>/research-pulse-backend:latest
          env:
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: pulse-secrets
                  key: MONGO_URI
          ports:
            - containerPort: 5000
          readinessProbe:
            httpGet:
              path: /api/
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 10
```

`worker-deployment.yaml` (snippet):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pulse-worker
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: pulse-worker
    spec:
      containers:
        - name: worker
          image: ghcr.io/<org>/research-pulse-backend:latest
          command: ["node", "src/jobs/worker.js"]
          envFrom:
            - secretRef:
                name: pulse-secrets
```

Notes:
- Use `HorizontalPodAutoscaler` (HPA) to scale workers by CPU or custom metrics (queue length via Prometheus exporter).
- Use `PodDisruptionBudgets` to avoid mass worker disruption during maintenance.

## Scaling, monitoring & observability

Monitoring & observability checklist:

- Export metrics (Prometheus) from Node app or instrument critical points (request latency, queue depth, job failure rates).
- Ship logs to central system (CloudWatch, ELK, Datadog) using container stdout.
- Configure alerts for: job failures, high queue backlog, high error rates, low disk/DB connectivity.

Backups & DR:

- Use managed MongoDB backup policies (Atlas snapshots) or schedule `mongodump` to a secure object store.
- Test restore procedures at least quarterly.

## Security & best practices

Additional security steps:

- Use HTTPS / TLS for all ingress and egress.
- Enforce network separation between services (private subnets for DBs).
- Rotate secrets and use short-lived credentials where possible.
- Limit API keys and GEMINI_API_KEY usage to backend servers behind VPC firewall.

## Troubleshooting

Debugging tips & commands:

- Check backend logs:

```bash
docker-compose logs -f backend
# or
kubectl logs -l app=pulse-backend
```

- Check worker queue length (Redis) and inspect failed jobs: use `redis-cli` or BullMQ monitoring UI (e.g., Arena, BullBoard).
- Confirm embedding service health:

```bash
curl http://localhost:5001/health
```

- Test Gemini client quickly (if you have key): run a simple curl or node script that hits your `/api/ai` endpoints.

Runtime troubleshooting checklist:

- 500 errors: check stack traces in backend logs and confirm `NODE_ENV` is not hiding them.
- Connection refused to Mongo/Redis: verify `MONGO_URI` and `REDIS_URL`, and check network/firewall.
- Slow background jobs: inspect worker CPU / memory and queue backlogs.

## Next steps (suggested)

1. Add `Dockerfile`s and `docker-compose.yml` (I can generate these for you)
2. Create GitHub Actions workflow to build and push images
3. Add deployment manifests (Kubernetes/Helm) if you need cluster orchestration

---
