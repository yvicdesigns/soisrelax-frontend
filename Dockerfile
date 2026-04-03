FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src

RUN npm run build

# Serveur nginx pour servir les fichiers statiques
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
