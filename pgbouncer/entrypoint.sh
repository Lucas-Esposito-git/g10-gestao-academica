#!/bin/sh
set -eu
umask 077
: "${AUTH_DB_PASSWORD:?missing AUTH_DB_PASSWORD}"
: "${PROFESSOR_DB_PASSWORD:?missing PROFESSOR_DB_PASSWORD}"
: "${COORD_DB_PASSWORD:?missing COORD_DB_PASSWORD}"
: "${READER_DB_PASSWORD:?missing READER_DB_PASSWORD}"
: "${PGBOUNCER_ADMIN_PASSWORD:?missing PGBOUNCER_ADMIN_PASSWORD}"
# As senhas são escritas somente no FS temporário do contêiner.
# Repositório de demonstração: substituir senhas padrão antes de implantação real.
printf '"usr_auth" "%s"\n"usr_professor" "%s"\n"usr_coordenador" "%s"\n"usr_leitor" "%s"\n"pgb_admin" "%s"\n' \
  "$AUTH_DB_PASSWORD" "$PROFESSOR_DB_PASSWORD" "$COORD_DB_PASSWORD" \
  "$READER_DB_PASSWORD" "$PGBOUNCER_ADMIN_PASSWORD" \
  > /tmp/pgbouncer/userlist.txt
exec pgbouncer /etc/pgbouncer/pgbouncer.ini
