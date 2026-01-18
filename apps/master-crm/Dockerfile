FROM node:18-alpine AS build
WORKDIR /app/apps/master-crm
COPY apps/master-crm/package*.json ./
RUN npm ci
COPY apps/master-crm ./
ARG VITE_API_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/apps/master-crm/dist /usr/share/nginx/html
COPY apps/master-crm/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
