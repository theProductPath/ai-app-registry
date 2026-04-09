# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY server/package.json server/
COPY web/package.json web/

# Install dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY server/ server/
COPY web/ web/
COPY skills/ skills/

# Build server
RUN npm run build --workspace=server

# Build web
RUN npm run build --workspace=web

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server/package.json server/

# Install production deps only
RUN npm install --workspace=server --omit=dev

# Copy built artifacts
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/src/migrations server/dist/migrations
COPY --from=build /app/web/dist web/dist
COPY --from=build /app/skills skills

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
