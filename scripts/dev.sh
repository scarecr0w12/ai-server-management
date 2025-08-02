#!/bin/bash

# Development script to run both frontend and backend

# Check if concurrently is installed globally
if ! command -v concurrently &> /dev/null
then
    echo "Installing concurrently globally..."
    npm install -g concurrently
fi

# Run both frontend and backend in development mode
concurrently "npm run dev" "npm start"
