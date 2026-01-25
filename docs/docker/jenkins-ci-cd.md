# Jenkins CI/CD with Docker

## What is Jenkins?

Jenkins = automation tool for CI/CD processes.

**What it does:**
- Listens for events (Git push, manual trigger, schedule...)
- Runs pipeline steps (build, test, deploy)
- Reports results (pass/fail, logs)

**Typical flow:**
```
Git push → Jenkins detects → Runs pipeline:
  1. Checkout code
  2. npm install
  3. npm test
  4. docker build
  5. docker push
  6. Deploy to server
```

---

## Jenkins as Docker Container

### Why container?
- Fast setup - one `docker run` and done
- Isolation from host system
- Easy deletion/reinstallation

### Running Jenkins container

```bash
docker pull jenkins/jenkins:lts
```

```bash
docker run -d -p 8080:8080 --name jenkins -v jenkins_home:/var/jenkins_home -v //var/run/docker.sock:/var/run/docker.sock --group-add 0 jenkins/jenkins:lts
```

**Flags explained:**
| Flag | Meaning |
|------|---------|
| `-d` | Detached (background) |
| `-p 8080:8080` | Port mapping HOST:CONTAINER |
| `--name jenkins` | Container name |
| `-v jenkins_home:/var/jenkins_home` | Volume for persistent data |
| `-v //var/run/docker.sock:/var/run/docker.sock` | Docker socket access |
| `--group-add 0` | Adds root group for socket permissions |

### Docker image naming

- `jenkins/jenkins` = organization/image (maintained by Jenkins)
- `node` = official image (maintained by Docker, short for `library/node`)

### Jenkins LTS vs latest

- `jenkins/jenkins:lts` = Long Term Support, stable version
- `jenkins/jenkins:latest` = newest, may be unstable

---

## Volume for Data

```
-v jenkins_home:/var/jenkins_home
```

**What's stored in volume:**
- Jenkins configuration
- Installed plugins
- Credentials
- Job definitions
- Build history
- Users

**Why volume:**
- Without volume: `docker rm jenkins` → all data lost
- With volume: data persists, new container loads it

**Location on Windows:**
```
\\wsl$\docker-desktop-data\data\docker\volumes\jenkins_home\
```

---

## Docker Socket Access

```
-v //var/run/docker.sock:/var/run/docker.sock
```

**What is socket:**
- File through which Docker CLI communicates with Docker daemon
- By mapping it, we give Jenkins container access to host Docker

**What it enables:**
- Jenkins can run `docker build`, `docker run`, `docker push`
- All images Jenkins creates end up on host

**Flow:** Jenkins container → Docker CLI → socket → Docker daemon (host)

---

## Docker CLI vs Docker Plugin

**Docker Pipeline plugin:**
- Installed in Jenkins UI
- Enables Jenkins to understand Docker syntax in pipeline
- Like a "driver's license" - you know how to drive

**Docker CLI:**
- Actual `docker` program that executes commands
- Must be installed inside container
- Like a "car" - can't go anywhere without it

### Installing Docker CLI in Jenkins container

```bash
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y docker.io"
```

**Explained:**
| Part | Meaning |
|------|---------|
| `docker exec` | Execute command in running container |
| `-u root` | As root user (needed for apt-get) |
| `jenkins` | Container name |
| `bash -c "..."` | Run bash and execute command |
| `apt-get update` | Refresh package list |
| `&&` | If successful, run next |
| `apt-get install -y docker.io` | Install Docker CLI (-y = auto yes) |

**Note:** Jenkins image uses Debian (not Alpine) so uses `apt-get`.

---

## Initial Setup

1. Open `http://localhost:8080`
2. Get initial password:
   ```bash
   docker logs jenkins
   ```
3. Install suggested plugins
4. Create admin user
5. Install additionally: **Docker Pipeline** plugin
   - Manage Jenkins → Plugins → Available → "Docker Pipeline"

---

## Pipeline Job

### Creating
1. New Item → name: `delta-app-pipeline` → Pipeline → OK

### Basic Jenkinsfile

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/username/repo.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t delta-app .'
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }
}
```

### Git URL formats
- HTTPS: `https://github.com/user/repo.git` - works immediately for public repos
- SSH: `git@github.com:user/repo.git` - requires SSH key setup

---

## Pipeline Triggers

| Method | Description |
|--------|-------------|
| Manual | Click "Build Now" |
| GitHub webhook | GitHub calls Jenkins on push (doesn't work with localhost) |
| Poll SCM | Jenkins periodically checks Git |
| Schedule (cron) | Runs at specified time |

For local Jenkins - use manual or Poll SCM.

---

## Docker Images Management

### Where are images stored?
On host (Docker Desktop) - Jenkins uses host Docker daemon.

```bash
docker images
```

### Dangling images
Old images without tag (`<none>:<none>`) - remain after rebuild.

```bash
# List dangling
docker images -f "dangling=true"

# Delete dangling
docker image prune -f
```

### Versioning
- Development: `delta-app:latest` (gets replaced)
- Production: `delta-app:1.0.0`, `delta-app:1.0.1` (preserved)

---

## Docker Hub Integration

### What is Docker Hub?
- Cloud registry for Docker images
- Like GitHub but for Docker images
- Free tier: unlimited public repos, 1 private repo

### Step 1: Create Docker Hub Account
1. Go to https://hub.docker.com
2. Sign up
3. Remember your username (e.g., `bobanbg`)

### Step 2: Add Credentials in Jenkins

1. Manage Jenkins → **Credentials**
2. Click on **(global)** domain
3. **Add Credentials**
4. Fill in:

| Field | Value |
|-------|-------|
| Kind | Username with password |
| Scope | Global |
| Username | your-dockerhub-username |
| Password | your-dockerhub-password |
| ID | `dockerhub-creds` |
| Description | DockerHub login |

5. Click **Create**

### Step 3: Update Jenkinsfile

Image name must include your DockerHub username:

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/BobanBg79/delta-app-mern.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t bobanbg/delta-app .'
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'
                    sh 'docker push bobanbg/delta-app'
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }
}
```

### How withCredentials Works

| Step | Location | What happens |
|------|----------|--------------|
| 1 | Jenkins Credentials Store | Stores encrypted: ID=`dockerhub-creds`, User=`bobanbg`, Pass=`********` |
| 2 | withCredentials block starts | Injects `$DOCKER_USER` and `$DOCKER_PASS` into build environment |
| 3 | Build environment | Executes: `docker login`, then `docker push` |
| 4 | withCredentials block ends | Variables are deleted from memory |

### Security Features

- Password stored encrypted in Jenkins
- Password masked in build logs (`****`)
- Credentials never visible in Jenkinsfile
- Temporary - only available during build

### Image Naming Convention

```bash
# Without username - only local use
docker build -t delta-app .

# With username - can push to DockerHub
docker build -t bobanbg/delta-app .
docker build -t bobanbg/delta-app:latest .    # same as above
docker build -t bobanbg/delta-app:1.0.0 .     # specific version
```

---

## Email Notifications

### Setup Gmail SMTP

1. Manage Jenkins → System
2. Scroll to **E-mail Notification** section
3. Fill in:

| Field | Value |
|-------|-------|
| SMTP server | `smtp.gmail.com` |
| Use SMTP Authentication | Yes |
| User Name | your-email@gmail.com |
| Password | App Password (16 chars) |
| Use SSL | Yes |
| SMTP Port | `465` |

### Gmail App Password

Gmail requires App Password (not your regular password):

1. Go to https://myaccount.google.com/apppasswords
2. 2-Step Verification must be enabled
3. Create new app password for "Jenkins"
4. Use the 16-character password in Jenkins

### Post Block in Jenkinsfile

Add `post` block after `stages` to send notifications:

```groovy
pipeline {
    agent any

    stages {
        // ... your stages ...
    }

    post {
        success {
            mail to: 'your-email@gmail.com',
                 subject: "Build USPEO: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "Build uspesno zavrsen.\n\nDetalji: ${env.BUILD_URL}"
        }
        failure {
            mail to: 'your-email@gmail.com',
                 subject: "Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "Build nije uspeo.\n\nProveri log: ${env.BUILD_URL}console"
        }
    }
}
```

### Post Conditions

| Condition | When it runs |
|-----------|--------------|
| `success` | All stages passed |
| `failure` | Any stage failed |
| `always` | Always, regardless of result |
| `unstable` | Tests failed (but build passed) |
| `changed` | Status changed from previous build |

---

## Useful Plugins

### Pipeline: Stage View

Shows graphical representation of pipeline stages with execution times.

1. Manage Jenkins → Plugins → Available
2. Search: **Pipeline: Stage View**
3. Install and restart

### Blue Ocean (optional)

Modern UI with animated pipeline visualization.

1. Manage Jenkins → Plugins → Available
2. Search: **Blue Ocean**
3. Install and restart
4. Access via "Open Blue Ocean" link in sidebar

---

## Jenkins Deployment Options

### 1. Jenkins as container (local/dev)
- Docker Desktop + Jenkins container + socket access
- What we set up

### 2. Jenkins on VM (production)
- Jenkins installed directly on Linux server
- Docker installed on same server
- No socket mapping needed (not in separate containers)
- Still needs Docker plugin

### 3. Managed Jenkins (cloud)
- AWS CodePipeline, Azure DevOps, CloudBees...
- No infrastructure management

---

## Useful Commands

```bash
# Jenkins container
docker ps                          # List active containers
docker logs jenkins                # Jenkins logs
docker logs -f jenkins             # Follow logs live
docker stop jenkins                # Stop
docker start jenkins               # Start
docker rm jenkins                  # Delete container
docker exec -it jenkins bash       # Enter container shell

# Volumes
docker volume ls                   # List volumes
docker volume inspect jenkins_home # Volume details
docker volume rm jenkins_home      # Delete volume

# Images
docker images                      # List images
docker image prune -f              # Delete dangling
docker rmi <image_id>              # Delete specific image
```

---

## Unit Tests in Pipeline

### Why Run Tests in Pipeline?

- **Gate before deploy** - broken code never gets pushed to DockerHub
- **Consistent environment** - same Node.js version as production
- **Automated** - no "forgot to run tests" mistakes

### Docker Agent for Tests

Tests need Node.js, but Jenkins container doesn't have it. Solution: run tests inside `node:20` container.

```groovy
stage('Unit tests') {
    agent {
        docker {
            image 'node:20'
            reuseNode true
        }
    }
    steps {
        sh 'npm ci'
        sh 'CI=true npm run test:coverage'
        sh 'cd client && npm ci && CI=true npm run test:coverage'
    }
}
```

**Explained:**

| Part | Meaning |
|------|---------|
| `agent { docker { image 'node:20' } }` | Run this stage inside node:20 container |
| `reuseNode true` | Use same workspace (where code is checked out) |
| `npm ci` | Clean install - predictable, uses package-lock.json exactly |
| `CI=true` | Disables React test watch mode |
| `test:coverage` | Generates coverage report for SonarQube |

### npm ci vs npm install

| Command | Behavior | Use case |
|---------|----------|----------|
| `npm install` | May update package-lock.json | Development |
| `npm ci` | Deletes node_modules, installs exactly from lock file | CI/CD |

**Best practice:** Always use `npm ci` in pipelines for reproducible builds.

### reuseNode Explained

Without `reuseNode true`:
```
/var/jenkins_home/workspace/delta-app-pipeline    ← Checkout stage (has code)
/var/jenkins_home/workspace/delta-app-pipeline@2  ← Docker agent (EMPTY!)
```

With `reuseNode true`:
```
/var/jenkins_home/workspace/delta-app-pipeline    ← Both stages use this
```

Jenkins creates separate workspace for each agent by default. `reuseNode true` tells Docker agent to use the same workspace where code was checked out.

### Coverage Reports

Tests generate coverage in `coverage/lcov.info`:
- Backend: `./coverage/lcov.info`
- Frontend: `./client/coverage/lcov.info`

SonarQube reads these files to display code coverage percentage.

---

## Pipeline Options (Best Practices)

### Workspace Cleanup

Ensures clean state before each build. Requires **Workspace Cleanup** plugin.

```groovy
stages {
    stage('Checkout') {
        steps {
            cleanWs()  // clean workspace before checkout
            git branch: 'main', url: '...'
        }
    }
}
```

**Without plugin:** Use built-in `deleteDir()`:

```groovy
steps {
    deleteDir()
    git branch: 'main', url: '...'
}
```

### Timeout

Prevents builds from running forever (stuck npm install, infinite loop, etc.).

```groovy
options {
    timeout(time: 30, unit: 'MINUTES')
}
```

### Build Discarder

Automatically deletes old builds to save disk space.

```groovy
options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
}
```

Keeps only last 10 builds. Each build contains:
- Console log
- Build metadata (duration, status, parameters)
- Artifacts (if any)

**Note:** This does NOT affect Docker images - only Jenkins build history.

### All Options Together

```groovy
pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                cleanWs()
                git branch: 'main', url: '...'
            }
        }
        // ...
    }
}
```

---

## Complete Production-Ready Jenkinsfile

```groovy
pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                cleanWs()
                git branch: 'main', url: 'https://github.com/BobanBg79/delta-app-mern.git'
            }
        }

        stage('Unit tests') {
            agent {
                docker {
                    image 'node:20'
                    reuseNode true
                }
            }
            steps {
                sh 'npm ci'
                sh 'CI=true npm run test:coverage'
                sh 'cd client && npm ci && CI=true npm run test:coverage'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t bobanbg/delta-app .'
            }
        }

        stage('Push to DockerHub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    sh 'docker push bobanbg/delta-app'
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            mail to: 'your-email@gmail.com',
                 subject: "Build USPEO: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "Build uspesno zavrsen.\n\nDetalji: ${env.BUILD_URL}"
        }
        failure {
            mail to: 'your-email@gmail.com',
                 subject: "Build FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "Build nije uspeo.\n\nProveri log: ${env.BUILD_URL}console"
        }
    }
}
```

**Security note:** `--password-stdin` is safer than `-p $DOCKER_PASS` - password doesn't appear in process list.

---

## Workspace Lifecycle

| Event | Workspace |
|-------|-----------|
| Create job | Does not exist |
| First build | Created automatically |
| Subsequent builds | Reused (unless cleanWs) |
| Delete job | Deleted automatically |
| Jenkins restart | Persists (on volume) |

**Location:** `/var/jenkins_home/workspace/{job-name}/`

---

## Next Steps (TODO)

- [ ] Image versioning (tags: 1.0.0, 1.0.1, etc.)
- [ ] SonarQube integration
