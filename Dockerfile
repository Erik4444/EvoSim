FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY src/       /usr/share/nginx/html/src/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO /dev/null http://localhost/health || exit 1
