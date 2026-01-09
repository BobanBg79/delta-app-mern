# Docker Cheatsheet

## Osnovni pojmovi

### Image
- Snapshot fajl sistema + metadata (kao ISO fajl)
- Nastaje iz Dockerfile-a komandom `docker build`
- Statičan, trajan dok ga ne obrišeš
- Lokacija (Windows): `C:\Users\<user>\AppData\Local\Docker\wsl\data\`

### Kontejner
- Izolovan proces koji koristi resurse hosta (CPU, RAM, disk)
- Nastaje iz image-a komandom `docker run`
- Ima iluziju sopstvenog fajl sistema, mreže, procesa
- Nije VM - koristi kernel host mašine

### Dockerfile
- Recept za pravljenje image-a
- Svaki `RUN` kreira privremeni kontejner → izvrši komandu → sačuva kao layer

### docker-compose.yml
- Orkestracija više kontejnera
- Nalazi se na host mašini (nije deo image-a)
- Definiše servise, portove, volume-e, env varijable

---

## Dockerfile - Backend (Node)

```dockerfile
FROM node:18-alpine          # Bazni image (Alpine ~5MB)
WORKDIR /app                 # Radni direktorijum u kontejneru
COPY package*.json ./        # Kopiraj package fajlove
RUN npm ci --only=production # Instaliraj samo prod dependencies
COPY . .                     # Kopiraj ostale fajlove
EXPOSE 5000                  # Dokumentacija porta (ne otvara ga)
CMD ["node", "server.js"]    # Komanda pri pokretanju
```

### CMD forme
- **Exec forma** `["node", "server.js"]` - preporučeno, Node je PID 1
- **Shell forma** `node server.js` - pokreće shell pa Node, problemi sa signalima

---

## Dockerfile - Frontend (React) - Multi-stage

```dockerfile
# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci                   # Sa devDependencies (treba za build)
COPY . .
RUN npm run build            # Kreira /app/build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Multi-stage benefiti
- Finalni image samo Nginx + statički fajlovi (~25MB)
- Node, node_modules, source kod - odbačeni

### Nginx specifičnosti
- `daemon off;` - drži Nginx u foregroundu (inače kontejner umre)
- `/usr/share/nginx/html` - default lokacija za serviranje fajlova

---

## docker-compose.yml

```yaml
version: '3.8'
services:
  server:
    build: .                 # Dockerfile u root-u
    ports:
      - "5000:5000"          # HOST:CONTAINER
    env_file:
      - .env                 # Čita varijable sa hosta
    environment:
      - NODE_ENV=production

  client:
    build: ./client          # Dockerfile u /client
    ports:
      - "80:80"
    depends_on:
      - server
```

### env_file
- `.env` ostaje na hostu, ne kopira se u image
- Docker injektuje varijable u kontejner pri pokretanju (runtime)
- Proces ih vidi kroz `process.env.MONGO_URI`

### ports mapping
```
"3000:5000" = localhost:3000 → kontejner:5000
```

---

## Docker komande

```bash
# Build
docker build -t ime-image .         # Izgradi image
docker-compose build                 # Izgradi sve servise

# Run
docker run -p 3000:5000 ime-image   # Pokreni kontejner
docker-compose up                    # Pokreni sve servise
docker-compose up --build            # Rebuild pa pokreni
docker-compose up -d                 # Detached (pozadina)

# Stop
docker-compose down                  # Zaustavi kontejnere
docker-compose down -v               # Zaustavi + obriši volume-e

# Info
docker images                        # Lista image-a
docker ps                            # Aktivni kontejneri
docker volume inspect mongo-data     # Info o volume-u
```

---

## Volumes (persistentni podaci)

```yaml
volumes:
  - mongo-data:/data/db      # Named volume
```

- Mapira folder kontejnera na disk hosta
- Preživljava restart/rebuild kontejnera
- Briše se samo sa `docker-compose down -v`
- Lokacija (Windows): `\\wsl$\docker-desktop-data\data\docker\volumes\`

---

## Linux fajl sistem

```
/                    # Root
├── bin/             # Osnovne komande (ls, cp, cat)
├── usr/bin/         # Programi (node, npm, git)
├── usr/local/bin/   # Ručno instalirani programi
└── app/             # Tvoj kod (WORKDIR)
```

---

## Procesi i signali

### Proces
- Pokrenut program sa svojim delom memorije i ID-jem (PID)
- Kontejner živi dok mu živi glavni proces (PID 1)

### Signali
- Mali broj (integer) koji OS šalje procesu

| Signal  | Broj | Značenje |
|---------|------|----------|
| SIGTERM | 15   | Ugasi se lepo |
| SIGKILL | 9    | Ugasi se odmah |
| SIGINT  | 2    | Ctrl+C |

### Fork
- Proces kreira kopiju sebe (parent → child)
- Nginx daemon: launcher forkuje workera pa završi → problem u Dockeru
- Node: nema fork, ostaje u foregroundu → OK za Docker

### Daemon vs Foreground
- **Daemon** - radi u pozadini, otkači se od terminala
- **Foreground** - drži terminal, Docker ga vidi kao aktivan proces

---

## PATH (sistemska varijabla)

- Lista foldera gde OS traži izvršne fajlove
- Windows: `System Properties → Environment Variables → Path`
- PowerShell: `$env:Path -split ';'`
- Zato `docker` radi bez pune putanje

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

Smanjuje image, ubrzava build.

---

## CI/CD (automatski build)

```yaml
# GitHub Actions primer
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

Tok: merge → CI detektuje → build → push na registry → server povuče novi image

---

## MongoDB Atlas umesto lokalnog

1. Obriši `mongo` servis iz docker-compose
2. Obriši `volumes` sekciju
3. U `.env` stavi Atlas connection string:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
   ```
4. U Atlas konzoli dozvoli IP (Network Access)
