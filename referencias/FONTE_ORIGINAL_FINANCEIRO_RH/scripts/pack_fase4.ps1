$src = 'C:\Users\vinad\OneDrive\Desktop\Modulo_Financeiro_v1\RH_DISK_V1'
$dest = 'c:\Users\vinad\Downloads\RH_DISK_V1_FASE4_GESTAO_PONTO_JORNADA.zip'
$brainDest = 'C:\Users\vinad\.gemini\antigravity-cli\brain\41b60be4-8ba3-4b86-b3f2-68073835370e\RH_DISK_V1_FASE4_GESTAO_PONTO_JORNADA.zip'
$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'rh_disk_fase4_' + [System.Guid]::NewGuid().ToString())

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Get-ChildItem -Path $src -Recurse | Where-Object {
    $_.FullName -notmatch '\\node_modules(\\|$)' -and
    $_.FullName -notmatch '\\\.git(\\|$)' -and
    $_.FullName -notmatch '\\dist(\\|$)'
} | ForEach-Object {
    $targetPath = $_.FullName.Replace($src, $tempDir)
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        $parent = Split-Path $targetPath
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}

if (Test-Path $dest) { Remove-Item $dest -Force }
Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $dest -Force
Copy-Item $dest -Destination $brainDest -Force
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Zip criado em: $dest"
Get-Item $dest | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
