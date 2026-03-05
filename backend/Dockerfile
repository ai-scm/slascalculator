# Stage 1: Build frontend (Vite/React)
# Build context must be the repo root so both /frontend and /backend are accessible.
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Backend runtime
FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

# Copy compiled frontend so the backend can serve it via SERVE_FRONTEND
COPY --from=frontend-builder /frontend/dist /frontend/dist

EXPOSE 3000
CMD ["node", "server.js"]
