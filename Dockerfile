FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY src/       /usr/share/nginx/html/src/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# Kein Docker-HEALTHCHECK – Coolify nutzt seinen eigenen Mechanismus.
# Der /health-Endpoint in nginx.conf bleibt erhalten und kann in der
# Coolify-UI als Health-Check-Pfad eingetragen werden.
