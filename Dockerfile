FROM nginx:alpine

COPY evolution_sim.html /usr/share/nginx/html/index.html

EXPOSE 80
