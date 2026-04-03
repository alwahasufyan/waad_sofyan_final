# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source
COPY . .

# Inject API URL during build (as specified in constraints)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Increase Node heap for large Vite production builds on small servers.
ARG BUILD_NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$BUILD_NODE_OPTIONS

# Allow Docker builds to choose the nginx configuration.
ARG NGINX_CONFIG=nginx.conf

# Build the project
RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for SPA routing
ARG NGINX_CONFIG=nginx.conf
COPY ${NGINX_CONFIG} /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use default Nginx entrypoint
CMD ["nginx", "-g", "daemon off;"]
