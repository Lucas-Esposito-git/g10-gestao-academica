# Executar no PowerShell a partir da pasta raiz do projeto.
$ErrorActionPreference = 'Stop'
function Testar-Perfil([string]$usuario,[string]$senha,[int]$id,[int]$esperado) {
    $sql = "BEGIN; SELECT set_config('app.usuario_id', '$id', true); SELECT 'QTD='||COUNT(*) FROM app.matriculas; COMMIT;"
    $saida = docker compose exec -T -e "PGPASSWORD=$senha" db psql -X -A -t -v ON_ERROR_STOP=1 -h pgbouncer -p 6432 -U $usuario -d academico -c $sql 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Falha na consulta RLS de $usuario : $saida" }
    $texto = $saida -join "`n"
    Write-Host "$usuario, ID=$id : $texto"
    if ($texto -notmatch "QTD=$esperado(\D|$)") { throw "Esperado $esperado matrículas para $usuario (ID=$id)." }
}
Testar-Perfil 'usr_professor' 'ProfessorDBDemo123!' 2 3
Testar-Perfil 'usr_professor' 'ProfessorDBDemo123!' 3 2
Testar-Perfil 'usr_coordenador' 'CoordDBDemo123!' 1 5
Write-Host "`nVerificando tentativa proibida de alterar nota de outro professor..." -ForegroundColor Cyan
$sql = "BEGIN; SELECT set_config('app.usuario_id','2',true); CALL app.sp_lancar_notas(3,9,9); ROLLBACK;"
$saida = docker compose exec -T -e 'PGPASSWORD=ProfessorDBDemo123!' db psql -X -v ON_ERROR_STOP=1 -h pgbouncer -p 6432 -U usr_professor -d academico -c $sql 2>&1
if ($LASTEXITCODE -eq 0) { throw 'A RLS não bloqueou a tentativa de alteração cruzada!' }
Write-Host 'OK: PostgreSQL bloqueou a alteração cruzada.' -ForegroundColor Green
