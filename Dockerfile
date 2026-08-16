FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/cli/dist /app/packages/cli/dist
COPY --from=builder /app/packages/core/dist /app/packages/core/dist
COPY --from=builder /app/packages/rules /app/packages/rules
COPY --from=builder /app/packages/cli/package.json /app/packages/cli/package.json
RUN npm install -g ./packages/cli
ENTRYPOINT ["zta"]
