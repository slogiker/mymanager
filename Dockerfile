FROM node:20-alpine

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /mymanager

# Copy workspace manifests for layer caching
COPY package*.json ./
COPY app/client/package*.json ./app/client/
COPY app/server/package*.json ./app/server/

# Install all workspace deps
RUN npm install

# Copy source
COPY . .

# Build React client
RUN npm run build --workspace=mymanager-client

# Ensure directories exist and chown to node user
RUN mkdir -p /mymanager/app/server/data /mymanager/app/server/uploads && \
    chown -R node:node /mymanager

USER node

EXPOSE 7293

ENV NODE_ENV=production

CMD ["npm", "start"]
