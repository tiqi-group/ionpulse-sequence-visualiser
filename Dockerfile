# Stage 1: Build (Node 22)
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache bash

# Copy package files and install dependencies
COPY package*.json ./
COPY scripts ./scripts
RUN sed -i 's/\r$//' ./scripts/* && chmod +x ./scripts/*.sh && npm ci

# Copy source files and build
COPY index.html vite.config.mts ./
COPY src ./src
COPY public ./public
RUN npm run build


# Stage 2: Runtime (Nginx)
FROM nginx:alpine

# copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback: serve index.html for all unknown routes
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]