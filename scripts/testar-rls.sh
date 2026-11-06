#!/bin/sh
# Valida de modo automatizado que cada professor vê apenas as suas matrículas.
set -eu
check_user() {
    USER_NAME="$1"; PASS="$2"; ID="$3"; EXPECTED="$4"
    OUTPUT=$(docker compose exec -T -e "PGPASSWORD=$PASS" db \
      psql -X -A -t -v ON_ERROR_STOP=1 -h pgbouncer -p 6432 -U "$USER_NAME" -d academico <<SQL
BEGIN;
SELECT set_config('app.usuario_id','$ID',true);
SELECT 'QTD='||COUNT(*) FROM app.matriculas;
COMMIT;
SQL
    )
    printf '%s\n' "$OUTPUT"
    printf '%s\n' "$OUTPUT" | grep -q "QTD=$EXPECTED" || {
        echo "ERRO: $USER_NAME deveria enxergar $EXPECTED matrículas" >&2; exit 1;
    }
}

echo 'Professora Ana (id 2) deve enxergar 3 matrículas...'
check_user usr_professor ProfessorDBDemo123! 2 3
echo 'Professor Bruno (id 3) deve enxergar 2 matrículas...'
check_user usr_professor ProfessorDBDemo123! 3 2
echo 'Coordenação deve enxergar todas as 5 matrículas...'
check_user usr_coordenador CoordDBDemo123! 1 5

printf '\nTestando bloqueio de alteração em notas de outra turma...\n'
if docker compose exec -T -e PGPASSWORD=ProfessorDBDemo123! db \
  psql -X -v ON_ERROR_STOP=1 -h pgbouncer -p 6432 -U usr_professor -d academico <<'SQL'; then
BEGIN;
SELECT set_config('app.usuario_id','2',true);
CALL app.sp_lancar_notas(3,9,9); -- matrícula 3 pertence ao professor Bruno
ROLLBACK;
SQL
    echo 'ERRO: professor conseguiu acessar nota de outra turma!' >&2
    exit 1
else
    echo 'OK: PostgreSQL rejeitou a alteração cruzada por RLS.'
fi
printf '\nTodos os testes de isolamento RLS passaram.\n'
