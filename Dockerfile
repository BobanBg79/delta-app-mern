# Stage 1: Build frontend
FROM node:20.19-alpine as build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client ./
RUN npm run build

# Stage 2: Production
FROM node:20.19-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY . .
COPY --from=build /app/client/build ./client/build

EXPOSE 5000
CMD ["node", "server.js"]
