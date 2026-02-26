# Dockerfile for Web (Frontend)
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY web/package.json web/package-lock.json* ./
RUN npm ci

# Copy source
COPY web/ ./

# Build
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
