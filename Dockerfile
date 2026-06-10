FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package management blueprints
COPY package*.json ./

# Clean installation of dependencies (including ngrok)
RUN npm ci --only=production

# Bundle full application source code
COPY . .

# Match the app interface mapping
EXPOSE 3000

# Use the secure node user context instead of root
USER node

# Execute runtime process
CMD ["node", "index.js"]
