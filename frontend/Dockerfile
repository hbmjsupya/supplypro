# syntax=docker/dockerfile:1
# Build stage
FROM node:22-alpine as build
WORKDIR /app

# Install build dependencies for native modules (Cache this layer)
# Use mirror for apk
RUN --mount=type=cache,target=/var/cache/apk \
    sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache python3 make g++

COPY package*.json ./

# Install with cache mount and npm mirror
# Use npm ci for faster, deterministic installs
RUN --mount=type=cache,target=/root/.npm \
    npm config set registry https://registry.npmmirror.com && \
    npm ci --prefer-offline --no-audit --progress=false

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
