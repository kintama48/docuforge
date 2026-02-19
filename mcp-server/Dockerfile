FROM oven/bun:1.2.22

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 3200
CMD ["bun", "run", "start"]
