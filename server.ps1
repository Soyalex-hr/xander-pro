$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Servidor PWA Xander Pro activo en http://localhost:$port/"
} catch {
    Write-Host "Puerto $port ocupado o servidor ya activo."
}

$root = "e:\SISTEMA DE COTIZACION"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq '/' -or [string]::IsNullOrWhiteSpace($path)) { $path = '/index.html' }
        $localFile = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
        
        if (Test-Path $localFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.js'   { 'application/javascript; charset=utf-8' }
                '.json' { 'application/manifest+json; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.svg'  { 'image/svg+xml' }
                '.png'  { 'image/png' }
                '.ico'  { 'image/x-icon' }
                default { 'application/octet-stream' }
            }
            $bytes = [System.IO.File]::ReadAllBytes($localFile)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Cache-Control", "no-cache")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # continue loop
    }
}
