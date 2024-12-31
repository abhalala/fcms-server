# Start the server
FROM node:16.20.2-bookworm AS dependencies

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn

FROM node:16.20.2-bookworm AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npx tsc

FROM node:16.20.2-bookworm AS deploy

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=dependencies /app/node_modules ./node_modules

RUN npx prisma generate

EXPOSE 3000

ENV PORT=3000

CMD ["node", "dist/src/index.js"]