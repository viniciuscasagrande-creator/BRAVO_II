# Script de Backup Geral do Sistema Disk Ingressos (Financeiro + RH)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$dateStr = Get-Date -Format "yyyyMMdd"
$sourceDir = (Resolve-Path "$PSScriptRoot\..").Path
$zipArchive = Join-Path $sourceDir "archives\Modulo_Financeiro_V1_BACKUP_GERAL_$dateStr.zip"
$zipRoot = Join-Path $sourceDir "Modulo_Financeiro_V1_BACKUP_GERAL_OFICIAL_$dateStr.zip"
$zipDesktop = "C:\Users\vinad\OneDrive\Desktop\Modulo_Financeiro_V1_BACKUP_GERAL_OFICIAL_$dateStr.zip"
$zipDownloads = "C:\Users\vinad\Downloads\Modulo_Financeiro_V1_BACKUP_GERAL_OFICIAL_$dateStr.zip"

$archivesDir = Join-Path $sourceDir "archives"
if (-not (Test-Path $archivesDir)) {
    New-Item -ItemType Directory -Path $archivesDir | Out-Null
}

Write-Host "Criando backup limpo via git archive..."
git -C "$sourceDir" archive --format=zip --output="$zipArchive" HEAD

if (Test-Path "$zipArchive") {
    Copy-Item "$zipArchive" "$zipRoot" -Force
    Copy-Item "$zipArchive" "$zipDesktop" -Force
    Copy-Item "$zipArchive" "$zipDownloads" -Force
    $size = (Get-Item "$zipArchive").Length
    Write-Host "Backup Geral gerado com sucesso!" -ForegroundColor Green
    Write-Host "Tamanho: $([math]::Round($size / 1MB, 2)) MB ($size bytes)"
    Write-Host "1. Archives: $zipArchive"
    Write-Host "2. Root: $zipRoot"
    Write-Host "3. Desktop: $zipDesktop"
    Write-Host "4. Downloads: $zipDownloads"
} else {
    Write-Host "Erro ao gerar arquivo de backup." -ForegroundColor Red
}
