# Giai đoạn 1: Build React
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# URL API được truyền từ Docker Compose
ARG REACT_APP_API_URL=/api/v1
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Giới hạn RAM cho Node và tắt sourcemap để build nhẹ, nhanh hơn
ENV NODE_OPTIONS=--max-old-space-size=3072
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Giai đoạn 2: Chạy React bằng Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]