# ============================
# Frontend Builder Stage
# ============================
FROM oven/bun:alpine AS builder

ENV NODE_ENV=production

COPY readsync-frontend /app
WORKDIR /app
RUN bun install --production
RUN bun run build

# ============================
# PocketBase Runtime Stage
# ============================
FROM alpine:latest

ARG PB_VERSION=0.31.0
ARG TARGETARCH

RUN apk add --no-cache unzip ca-certificates

# determine architecture for PocketBase download
# PocketBase uses 'amd64' or 'arm64' in release filenames
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      PB_ARCH="linux_arm64"; \
    else \
      PB_ARCH="linux_amd64"; \
    fi && \
    echo "Downloading PocketBase for ${PB_ARCH}" && \
    wget -qO /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" && \
    unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip

# copy migrations and built frontend
COPY ./pb_migrations /pb/pb_migrations
# COPY ./pb_hooks /pb/pb_hooks   # optional: uncomment if you have hooks
COPY --from=builder /app/dist /pb/pb_public

EXPOSE 8080

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]