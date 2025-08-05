FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl and nginx
RUN apk add --no-cache curl nginx

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and environment files
COPY . .

# Build the application
RUN npm run build

# Install nginx and curl
RUN apk add --no-cache nginx curl

# Create a script to inject environment variables at runtime
RUN echo '#!/bin/sh' > /app/inject-env.sh && \
    echo '' >> /app/inject-env.sh && \
    echo '# Inject environment variables into the built JavaScript files' >> /app/inject-env.sh && \
    echo 'for file in /app/build/static/js/*.js; do' >> /app/inject-env.sh && \
    echo '  if [ -f "$file" ]; then' >> /app/inject-env.sh && \
    echo '    sed -i "s|http://localhost:4000|${REACT_APP_API_URL}|g" "$file"' >> /app/inject-env.sh && \
    echo '    sed -i "s|http://localhost:5000|${REACT_APP_WS_URL}|g" "$file"' >> /app/inject-env.sh && \
    echo '  fi' >> /app/inject-env.sh && \
    echo 'done' >> /app/inject-env.sh && \
    echo '' >> /app/inject-env.sh && \
    echo '# Start nginx' >> /app/inject-env.sh && \
    echo 'exec nginx -g "daemon off;"' >> /app/inject-env.sh && \
    chmod +x /app/inject-env.sh

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 4000

# Start nginx with environment variable injection
CMD ["/app/inject-env.sh"]
