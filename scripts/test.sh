#!/bin/bash

# Test script to verify both frontend and backend can start correctly

# Kill any processes running on ports 3000 and 5000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

echo "Testing backend startup..."
cd /home/scarecrow/Documents/Development/antherthing/CascadeProjects/windsurf-project/backend
timeout 10s npm run dev &
BACKEND_PID=$!
sleep 5

if ps -p $BACKEND_PID > /dev/null
then
    echo "Backend started successfully"
    kill $BACKEND_PID 2>/dev/null
else
    echo "Backend failed to start"
fi

echo "Testing frontend startup..."
cd /home/scarecrow/Documents/Development/antherthing/CascadeProjects/windsurf-project/frontend
timeout 10s npm start &
FRONTEND_PID=$!
sleep 5

if ps -p $FRONTEND_PID > /dev/null
then
    echo "Frontend started successfully"
    kill $FRONTEND_PID 2>/dev/null
else
    echo "Frontend failed to start"
fi

echo "Test completed"
