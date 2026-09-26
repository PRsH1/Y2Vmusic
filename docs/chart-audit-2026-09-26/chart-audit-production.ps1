param([string]$Indexes = '')
$audit = Get-Content -LiteralPath 'temp/chart-audit-results.json' -Raw -Encoding UTF8 | ConvertFrom-Json
[array]$checks = if (Test-Path -LiteralPath 'temp/chart-audit-production.json') { @(Get-Content -LiteralPath 'temp/chart-audit-production.json' -Raw -Encoding UTF8 | ConvertFrom-Json) } else { @() }
$index = -1
foreach ($entry in $audit.results) {
    $index += 1
    if ($Indexes -and [string]$index -notin $Indexes.Split(',')) { continue }
    if ($entry.comparison.sameIdsInOrder) { continue }
    if ($checks | Where-Object { $_.id -eq $entry.id -and $_.sameIdsInOrder }) { continue }
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri ('https://y2vmusic.duckdns.org/api/charts?id=' + $entry.id) -TimeoutSec 20
        $data = [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
        $actualIds = @($data.tracks | ForEach-Object { $_.videoId })
        $expectedIds = @($entry.original.tracks | ForEach-Object { $_.videoId })
        $check = [pscustomobject]@{ id=$entry.id; label=$entry.label; checkedAt=[DateTime]::UtcNow.ToString('o'); status=$response.StatusCode; count=$data.tracks.Count; sameIdsInOrder=($actualIds.Count -eq $expectedIds.Count -and ($actualIds -join ',') -eq ($expectedIds -join ',')); response=$data }
        $check | Select-Object label,status,count,sameIdsInOrder | ConvertTo-Json -Compress
    } catch {
        $check = [pscustomobject]@{id=$entry.id;label=$entry.label;error=$_.Exception.Message}
        $check | ConvertTo-Json -Compress
    }
    $checks += $check
    $checks | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath 'temp/chart-audit-production.json' -Encoding UTF8
}
