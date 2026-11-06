#!/bin/sh
# PgBouncer: painel administrativo disponível SOMENTE na rede privada Docker.
set -eu
PASSWORD=${PGBOUNCER_ADMIN_PASSWORD:-PoolAdminDemo123!}
docker compose exec -T -e "PGPASSWORD=$PASSWORD" db \
  psql -X -h pgbouncer -p 6432 -U pgb_admin -d pgbouncer -c 'SHOW POOLS;'
