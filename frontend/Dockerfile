FROM node:22-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"] 