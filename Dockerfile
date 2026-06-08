# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend
FROM node:20-alpine
WORKDIR /app

# Add build tools for native dependencies (bcrypt, sqlite3)
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy frontend build to a place backend expects it
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port and start
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

WORKDIR /app/backend
CMD ["npm", "start"]
