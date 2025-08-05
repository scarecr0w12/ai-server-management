#!/bin/bash

# Test Docker Setup Script

echo "Testing Docker Setup for Windsurf Project"
echo "======================================"

# Test 1: Check if all containers are running
echo "\n1. Checking container status..."
docker compose ps

# Test 2: Test frontend response
echo "\n2. Testing frontend response..."
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:4000

# Test 3: Test backend response
echo "\n3. Testing backend API response..."
curl -s -o /dev/null -w "Backend API: %{http_code}\n" http://localhost:5000/api/workflows

# Test 4: Test database connection
echo "\n4. Testing database connection..."
docker compose exec database pg_isready -U postgres -d server_manager > /dev/null 2>&1 && echo "Database: OK" || echo "Database: ERROR"

echo "\nDocker setup test completed!"
echo "Access the application at: http://localhost:4000"
