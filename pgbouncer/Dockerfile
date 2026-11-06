FROM alpine:3.22
RUN apk add --no-cache pgbouncer busybox-extras \
    && addgroup -S pool && adduser -S -G pool pool \
    && mkdir -p /etc/pgbouncer /tmp/pgbouncer \
    && chown -R pool:pool /tmp/pgbouncer
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER pool
ENTRYPOINT ["/entrypoint.sh"]
