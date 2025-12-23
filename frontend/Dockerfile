# frontend/Dockerfile

# Stage 1: Build the React Application
FROM node:20-alpine as build

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with a lightweight web server (NGINX)
FROM nginx:alpine

# Copy built assets from Stage 1 to NGINX public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 (default for web traffic)
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]