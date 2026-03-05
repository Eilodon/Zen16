# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build the backend and serve both
FROM python:3.12-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend from Stage 1 into the static file routing path
COPY --from=frontend-build /app/dist ./static

# Expose Cloud Run port
EXPOSE 8080

# Run FastAPI app with Uvicorn — WORKDIR is /app which IS the backend dir
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
