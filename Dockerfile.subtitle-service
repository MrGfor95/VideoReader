FROM node:24-bookworm-slim

ENV PORT=8080
ENV PYTHON_FOR_YTDLP=/usr/bin/python3

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp \
  && corepack enable \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock tsconfig.json next.config.ts open-next.config.ts ./
COPY src ./src
COPY subtitle-service ./subtitle-service

RUN yarn install --frozen-lockfile --production=false

ENV NODE_ENV=production

EXPOSE 8080

CMD ["yarn", "start:subtitle"]
