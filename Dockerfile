# ── Stage 1: Build Frontend ──
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Server ──
FROM node:20-alpine
WORKDIR /app

# Install native dependencies for sharp & tesseract if required
RUN apk add --no-cache vips-dev python3 make g++

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets from stage 1 to the exact location expected by app.js (../../frontend/dist)
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

EXPOSE 5000

CMD ["node", "server.js"]
