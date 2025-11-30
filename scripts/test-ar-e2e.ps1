# PowerShell E2E test for AR demo creation and status polling
# Usage: powershell.exe -ExecutionPolicy Bypass -File .\scripts\test-ar-e2e.ps1 [-ApiBase "https://photobooksgallery.am"] [-PhotoUrl <url>] [-VideoSeconds <int>] [-PollSeconds <int>] [-MaxPolls <int>]

param(
    [string]$ApiBase = "https://photobooksgallery.am",
    [string]$PhotoUrl = "https://picsum.photos/600/400.jpg",
    [int]$VideoSeconds = 3,
    [int]$PollSeconds = 10,
    [int]$MaxPolls = 12
)

Write-Host "--- Prepare local test files ---"
$photoPath = Join-Path $PWD "test-photo.jpg"
$videoPath = Join-Path $PWD "test-video.mp4"

try {
    Invoke-WebRequest -Uri $PhotoUrl -OutFile $photoPath -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Warning ("Failed to download photo from {0}: {1}" -f $PhotoUrl, $($_))
    throw
}

# Generate a simple blue test video using ffmpeg if available
function Ensure-TestVideo {
    param([string]$Path, [int]$Seconds)
    $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if (-not $ffmpeg) {
        Write-Warning "ffmpeg not found in PATH. Downloading a tiny sample MP4."
        $urls = @(
            "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
            "https://sample-videos.com/video321/mp4/240/big_buck_bunny_240p_1mb.mp4",
            "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4"
        )
        foreach ($u in $urls) {
            try {
                Invoke-WebRequest -Uri $u -OutFile $Path -UseBasicParsing -ErrorAction Stop
                Write-Host "Downloaded sample video from $u"
                return
            } catch {
                Write-Warning ("Failed to download sample video from {0}: {1}" -f $u, $($_))
            }
        }
        Write-Warning "All sample video downloads failed."
        return
    }
    Write-Host "Generating test video ($Seconds s) at $Path"
    & $ffmpeg.Path -y -f lavfi -i "color=c=blue:s=640x360:d=$Seconds" -c:v libx264 -pix_fmt yuv420p $Path | Out-Null
}

Ensure-TestVideo -Path $videoPath -Seconds $VideoSeconds

Write-Host "Photo: $photoPath"; if (Test-Path $videoPath) { Write-Host "Video: $videoPath" } else { Write-Host "Video: (none)" }

Write-Host "--- Create demo AR ---"
$createUri = "$ApiBase/api/ar/create-demo"

# Build multipart form
function Invoke-MultipartPost {
    param(
        [string]$Uri,
        [System.Collections.IDictionary]$Files
    )
    Add-Type -AssemblyName System.Net.Http
    $handler = New-Object System.Net.Http.HttpClientHandler
    $client  = New-Object System.Net.Http.HttpClient($handler)
    $content = New-Object System.Net.Http.MultipartFormDataContent
    foreach ($key in $Files.Keys) {
        $fi = $Files[$key]
        $fs = [System.IO.File]::OpenRead($fi.FullName)
        $sc = New-Object System.Net.Http.StreamContent($fs)
        $ext = [System.IO.Path]::GetExtension($fi.Name).ToLowerInvariant()
        switch ($ext) {
            '.jpg' { $mime = 'image/jpeg' }
            '.jpeg' { $mime = 'image/jpeg' }
            '.png' { $mime = 'image/png' }
            '.gif' { $mime = 'image/gif' }
            '.mp4' { $mime = 'video/mp4' }
            default { $mime = 'application/octet-stream' }
        }
        $sc.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($mime)
        $content.Add($sc, $key, $fi.Name)
    }
    $response = $client.PostAsync($Uri, $content).Result
    $body     = $response.Content.ReadAsStringAsync().Result
    $client.Dispose()
    [pscustomobject]@{ StatusCode = [int]$response.StatusCode; Content = $body }
}

$files = @{}
$files['photos'] = Get-Item -LiteralPath $photoPath
if (Test-Path -LiteralPath $videoPath) { $files['videos'] = Get-Item -LiteralPath $videoPath }

$resp = Invoke-MultipartPost -Uri $createUri -Files $files

if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
    Write-Error ("Unexpected status code: {0}" -f $resp.StatusCode)
    Write-Host $resp.Content
    exit 1
}

try {
    $json = $resp.Content | ConvertFrom-Json
} catch {
    Write-Warning "Create-demo response is not JSON. Raw content:"; Write-Host $resp.Content
    exit 1
}
if ($json.data) { $data = $json.data } else { $data = $json }
if (-not $data.projectId -or -not $data.statusUrl -or -not $data.viewUrl) {
    Write-Warning "Create-demo JSON missing expected fields."; Write-Host ($resp.Content)
    exit 1
}
Write-Host ("Project: {0}" -f $data.projectId)
Write-Host ("Status: {0}" -f $data.statusUrl)
Write-Host ("View:   {0}" -f $data.viewUrl)

Write-Host "--- Poll status ---"
$statusUri = if ($data.statusUrl -match '^https?://') { $data.statusUrl } else { "$ApiBase$($data.statusUrl)" }

$ready = $false
for ($i=1; $i -le $MaxPolls; $i++) {
    Start-Sleep -Seconds $PollSeconds
    try {
        $stResp = Invoke-WebRequest -Uri $statusUri -UseBasicParsing -Method Get -ErrorAction Stop
        $stJson = $stResp.Content | ConvertFrom-Json
    } catch {
        Write-Warning "Status request failed (attempt $i): $_"
        continue
    }
    Write-Host ("Attempt {0}: status={1} progress={2}" -f $i, $stJson.status, ($stJson.progress -as [string]))
    if ($stJson.status -eq 'ready') { $ready = $true; break }
}

Write-Host "--- Done ---"
if ($ready) {
    Write-Host ("Ready. Open: {0}" -f $json.viewUrl)
    exit 0
} else {
    Write-Warning "Not ready after $MaxPolls attempts."
    Write-Host ("You can keep checking: {0}" -f $statusUri)
    exit 2
}
