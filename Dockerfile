# Use Node.js LTS version
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy root package.json for workspace setup
COPY package*.json ./

# Copy and build shared package first
COPY shared/ ./shared/
WORKDIR /app/shared
RUN npm ci && npm run build

# Copy backend files
WORKDIR /app
COPY backend/ ./backend/

# Install backend dependencies and build
WORKDIR /app/backend
RUN npm ci && npm run build

# Clean up dev dependencies
RUN npm ci --only=production

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]