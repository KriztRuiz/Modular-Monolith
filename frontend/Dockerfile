# multi-stage build for Vite + React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
COPY public ./public
COPY src ./src
RUN npm ci --silent
RUN npm run build

# production image
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# copy a minimal nginx conf if needed (default is fine)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
