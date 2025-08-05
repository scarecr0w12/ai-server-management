# Docker Setup for Windsurf Project

This project includes Docker configurations for easy local development and testing.

## Prerequisites

- Docker Engine
- Docker Compose (v2)

## Quick Start

1. Set your OpenAI API key in the `.env` file:

   ```text
   OPENAI_API_KEY=your_actual_api_key_here
   ```

2. Build and start all services:
   ```bash
   docker compose up -d
   ```

3. Access the application:

   - Frontend: <http://localhost:4000>
   - Backend API: <http://localhost:5000>
   - Database: localhost:5433 (PostgreSQL)

## Next Steps

1. Set your OpenAI API key in the `.env` file
2. Run `docker compose up -d` to start all services
3. Access the application at http://localhost:4000

## Services

- **Frontend**: React application on port 4000
- **Backend**: Node.js/Express server on port 5000
- **Database**: PostgreSQL on port 5433

## Health Checks

The Docker containers include health checks to ensure that services are running properly:

- **Backend**: Checks if the server is responding to API requests
- **Frontend**: Checks if the React development server is running
- **Database**: Checks if PostgreSQL is ready to accept connections

You can view the health status of containers with `docker compose ps`.

The health checks are configured with the following parameters:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 40 seconds (time to wait before starting health checks)

If a container fails its health check, Docker will attempt to restart it automatically.

## Automated Builds and Deployment

This project includes GitHub Actions workflows for automated builds and deployment:

- **Docker Build and Push**: Automatically builds and pushes Docker images to GitHub Container Registry on pushes to the main branch
- **Test**: Runs automated tests on both frontend and backend services for every push and pull request
- **Deploy**: Deploys the application to AWS ECS (requires AWS credentials and ECS configuration)

To use these workflows:
1. Set up the required secrets in your GitHub repository settings
2. Configure the AWS ECS task definitions in the `backend/` and `frontend/` directories
3. Update the environment variables in the deploy workflow as needed

The workflows will automatically trigger on pushes to the main branch and pull requests.

## Useful Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs

# View logs for a specific service
docker compose logs backend

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# View running containers
docker compose ps
```

## Environment Variables

All environment variables are configured in the root `.env` file.
