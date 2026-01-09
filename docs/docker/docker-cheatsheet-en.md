# Docker Cheatsheet

## Basic Concepts

### Image
- Snapshot of file system + metadata (like an ISO file)
- Created from Dockerfile via `docker build`
- Static, persistent until deleted
- Location (Windows): `C:\Users\<user>\AppData\Local\Docker\wsl\data\`

### Container
- Isolated process using host resources (CPU, RAM, disk)
- Created from image via `docker run`
- Has illusion of its own file system, network, processes
- Not a VM - uses host kernel

### Dockerfile
- Recipe for building an image
- Each `RUN` creates temporary container → executes command → saves as layer

### docker-compose.yml
- Orchestration of multiple containers
- Lives on host machine (not part of image)
- Defines services, ports, volumes, env variables

---

## Dockerfile - Backend (Node)

```dockerfile
FROM node:18-alpine          # Base image (Alpine ~5MB)
WORKDIR /app                 # Working directory in container
COPY package*.json ./        # Copy package files
RUN npm ci --only=production # Install only prod dependencies
COPY . .                     # Copy remaining files
EXPOSE 5000                  # Port documentation (doesn't open it)
CMD ["node", "server.js"]    # Command on startup
```

### CMD forms
- **Exec form** `["node", "server.js"]` - recommended, Node is PID 1
- **Shell form** `node server.js` - runs shell then Node, signal issues

---

## Dockerfile - Frontend (React) - Multi-stage

```dockerfile
# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci                   # With devDependencies (needed for build)
COPY . .
RUN npm run build            # Creates /app/build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Multi-stage benefits
- Final image only Nginx + static files (~25MB)
- Node, node_modules, source code - discarded

### Nginx specifics
- `daemon off;` - keeps Nginx in foreground (otherwise container dies)
- `/usr/share/nginx/html` - default location for serving files

---

## docker-compose.yml

```yaml
version: '3.8'
services:
  server:
    build: .                 # Dockerfile in root
    ports:
      - "5000:5000"          # HOST:CONTAINER
    env_file:
      - .env                 # Reads variables from host
    environment:
      - NODE_ENV=production

  client:
    build: ./client          # Dockerfile in /client
    ports:
      - "80:80"
    depends_on:
      - server
```

### env_file
- `.env` stays on host, not copied to image
- Docker injects variables into container at runtime
- Process sees them via `process.env.MONGO_URI`

### ports mapping
```
"3000:5000" = localhost:3000 → container:5000
```

---

## Docker Commands

```bash
# Build
docker build -t image-name .        # Build image
docker-compose build                 # Build all services

# Run
docker run -p 3000:5000 image-name  # Run container
docker-compose up                    # Run all services
docker-compose up --build            # Rebuild then run
docker-compose up -d                 # Detached (background)

# Stop
docker-compose down                  # Stop containers
docker-compose down -v               # Stop + delete volumes

# Info
docker images                        # List images
docker ps                            # Active containers
docker volume inspect mongo-data     # Volume info
```

---

## Volumes (Persistent Data)

```yaml
volumes:
  - mongo-data:/data/db      # Named volume
```

- Maps container folder to host disk
- Survives container restart/rebuild
- Only deleted with `docker-compose down -v`
- Location (Windows): `\\wsl$\docker-desktop-data\data\docker\volumes\`

---

## Linux File System

```
/                    # Root
├── bin/             # Basic commands (ls, cp, cat)
├── usr/bin/         # Programs (node, npm, git)
├── usr/local/bin/   # Manually installed programs
└── app/             # Your code (WORKDIR)
```

---

## Processes and Signals

### Process
- Running program with its own memory and ID (PID)
- Container lives as long as main process (PID 1) lives

### Signals
- Small integer that OS sends to a process

| Signal  | Number | Meaning |
|---------|--------|---------|
| SIGTERM | 15     | Terminate gracefully |
| SIGKILL | 9      | Terminate immediately |
| SIGINT  | 2      | Ctrl+C |

### Fork
- Process creates a copy of itself (parent → child)
- Nginx daemon: launcher forks worker then exits → problem in Docker
- Node: no fork, stays in foreground → OK for Docker

### Daemon vs Foreground
- **Daemon** - runs in background, detaches from terminal
- **Foreground** - holds terminal, Docker sees it as active process

---

## PATH (System Variable)

- List of folders where OS looks for executables
- Windows: `System Properties → Environment Variables → Path`
- PowerShell: `$env:Path -split ';'`
- That's why `docker` works without full path

---

## .dockerignore

```
node_modules
.git
.env
.claude
*.log
tests
docs
```

Reduces image size, speeds up build.

---

## CI/CD (Automatic Build)

```yaml
# GitHub Actions example
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t app:latest .
      - run: docker push app:latest
```

Flow: merge → CI detects → build → push to registry → server pulls new image

---

## MongoDB Atlas Instead of Local

1. Remove `mongo` service from docker-compose
2. Remove `volumes` section
3. In `.env` add Atlas connection string:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
   ```
4. In Atlas console allow IP (Network Access)
