FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Final Stage: Nginx
FROM nginx:alpine

# Copy built Angular files to Nginx serve directory
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Custom nginx config to handle Angular routing (fallback to index.html)
RUN echo "server { \
    listen 80; \
    location /api/ { \
        proxy_pass http://backend:8080/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Host \$host; \
        proxy_set_header X-Real-IP \$remote_addr; \
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto \$scheme; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
