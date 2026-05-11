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
RUN npm run build --workspace=client

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
