# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm ci --legacy-peer-deps
RUN npx kendo-ui-license activate
RUN npm run build

# Serve with nginx
FROM nginx:alpine AS runtime
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
