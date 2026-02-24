FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including devDependencies for Tailwind build)
RUN npm install && npm cache clean --force

# Copy the rest of the app
COPY . .

# Build Tailwind CSS
RUN npm run build:css

EXPOSE 3000

CMD ["npm", "start"]
