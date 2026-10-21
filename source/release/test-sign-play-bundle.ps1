#Requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BundlePath,
    [Parameter(Mandatory)][string]$ExpectedBundleSha256,
    [Parameter(Mandatory)][string]$JavaHome,
    [Parameter(Mandatory)][string]$WorkRoot
)
$ErrorActionPreference = 'Stop'
function Assert-Check([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }
function File-Digest([string]$File) { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash }
function Bundle-Entries([string]$File) {
    $entries = @{}
    $archive = [IO.Compression.ZipFile]::OpenRead($File)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -match '^META-INF/(MANIFEST\.MF|[^/]+\.(SF|RSA|DSA|EC))$') { continue }
            $stream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
            try { $entries[$entry.FullName] = [Convert]::ToHexString($sha.ComputeHash($stream)) }
            finally { $stream.Dispose(); $sha.Dispose() }
        }
    } finally { $archive.Dispose() }
    return $entries
}

$root = [IO.Path]::GetFullPath($WorkRoot)
$caseDirectory = Join-Path $root ('signing-qa-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($caseDirectory) | Out-Null
$passwordText = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$password = ConvertTo-SecureString $passwordText -AsPlainText -Force
$previousEnvironment = [Environment]::GetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', 'Process')
$signer = Join-Path $PSScriptRoot 'sign-play-bundle.ps1'
$jdkVerifier = Join-Path $JavaHome 'bin/jarsigner.exe'
$key = Join-Path $caseDirectory 'disposable-qa.p12'
$signed = Join-Path $caseDirectory 'QA-ONLY.aab'
$originalDigest = File-Digest $BundlePath
$checks = 0
try {
    [Environment]::SetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', 'qa-sentinel', 'Process')
    $badHashRejected = $false
    try { & $signer -BundlePath $BundlePath -ExpectedBundleSha256 ('0' * 64) -OutputPath $signed -JavaHome $JavaHome -KeyStorePath $key -CreateUploadKey -StorePassword $password | Out-Null }
    catch { $badHashRejected = $true }
    Assert-Check ($badHashRejected -and -not (Test-Path -LiteralPath $key) -and -not (Test-Path -LiteralPath $signed)) 'Wrong input hash must fail before creating a key or output'; $checks++

    & $signer -BundlePath $BundlePath -ExpectedBundleSha256 $ExpectedBundleSha256 -OutputPath $signed -JavaHome $JavaHome -KeyStorePath $key -CreateUploadKey -StorePassword $password | Out-Null
    $report = Get-Content -LiteralPath ($signed + '.verification.json') -Raw | ConvertFrom-Json
    Assert-Check ($report.jdkSignatureVerified -and -not $report.privateKeyUploaded -and -not $report.playSubmitted) 'Signing report must not claim a Play upload'
    Assert-Check ([Environment]::GetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', 'Process') -ceq 'qa-sentinel') 'Password environment must be restored'; $checks++
    $before = Bundle-Entries $BundlePath; $after = Bundle-Entries $signed
    Assert-Check ($before.Count -eq $after.Count) 'Signing changed bundle entry count'
    foreach ($name in $before.Keys) { Assert-Check ($after[$name] -ceq $before[$name]) ('Signing changed game bytes: ' + $name) }; $checks++
    $certificateText = Get-Content -LiteralPath ($signed + '.upload-certificate.pem') -Raw
    Assert-Check ($certificateText.Contains('BEGIN CERTIFICATE') -and -not $certificateText.Contains('PRIVATE KEY')) 'Only a public upload certificate may be exported'; $checks++

    $keyDigest = File-Digest $key; $signedDigest = File-Digest $signed
    $overwriteRejected = $false
    try { & $signer -BundlePath $BundlePath -ExpectedBundleSha256 $ExpectedBundleSha256 -OutputPath $signed -JavaHome $JavaHome -KeyStorePath $key -StorePassword $password | Out-Null }
    catch { $overwriteRejected = $true }
    Assert-Check ($overwriteRejected -and (File-Digest $signed) -ceq $signedDigest -and (File-Digest $key) -ceq $keyDigest) 'Existing output or key was overwritten'; $checks++
    $keyOverwriteRejected = $false
    try { & $signer -BundlePath $BundlePath -ExpectedBundleSha256 $ExpectedBundleSha256 -OutputPath (Join-Path $caseDirectory 'must-not-exist.aab') -JavaHome $JavaHome -KeyStorePath $key -CreateUploadKey -StorePassword $password | Out-Null }
    catch { $keyOverwriteRejected = $true }
    Assert-Check ($keyOverwriteRejected -and (File-Digest $key) -ceq $keyDigest) 'Create-key mode overwrote an existing identity'; $checks++

    $wrongOutput = Join-Path $caseDirectory 'wrong-password.aab'
    $wrongPassword = ConvertTo-SecureString ('wrong-' + $passwordText) -AsPlainText -Force
    $wrongPasswordRejected = $false
    try { & $signer -BundlePath $BundlePath -ExpectedBundleSha256 $ExpectedBundleSha256 -OutputPath $wrongOutput -JavaHome $JavaHome -KeyStorePath $key -StorePassword $wrongPassword | Out-Null }
    catch { $wrongPasswordRejected = $true }
    finally { $wrongPassword.Dispose() }
    Assert-Check ($wrongPasswordRejected -and -not (Test-Path -LiteralPath $wrongOutput) -and (File-Digest $key) -ceq $keyDigest) 'Wrong password must not publish an AAB or alter the key'
    Assert-Check (@(Get-ChildItem -LiteralPath $caseDirectory -Filter '.signing-*.aab').Count -eq 0) 'Failed signing left a temporary bundle'; $checks++

    [Environment]::SetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', $passwordText, 'Process')
    foreach ($kind in @('tampered-entry', 'unsigned-addition')) {
        $changed = Join-Path $caseDirectory ($kind + '.aab'); Copy-Item -LiteralPath $signed -Destination $changed
        $zip = [IO.Compression.ZipFile]::Open($changed, [IO.Compression.ZipArchiveMode]::Update)
        try {
            $name = if ($kind -eq 'tampered-entry') { 'base/assets/game/index.html' } else { 'unsigned-injected.txt' }
            if ($kind -eq 'tampered-entry') { $zip.GetEntry($name).Delete() }
            $stream = $zip.CreateEntry($name).Open()
            try { $data = [Text.Encoding]::UTF8.GetBytes('DISPOSABLE QA: changed bytes'); $stream.Write($data, 0, $data.Length) } finally { $stream.Dispose() }
        } finally { $zip.Dispose() }
        $rejectedOutput = & $jdkVerifier -verify -strict -keystore $key -storepass:env WIN_AGAIN_SIGNING_PASSWORD $changed winagain-upload 2>&1
        Assert-Check ($LASTEXITCODE -ne 0) ('JDK accepted ' + $kind); $checks++
    }
    Assert-Check ((File-Digest $BundlePath) -ceq $originalDigest) 'Original unsigned bundle was changed'; $checks++
    [ordered]@{ checks = $checks; allPassed = $true; realReleaseKeyCreated = $false; playSubmitted = $false; inputSha256 = $originalDigest.ToLowerInvariant() } | ConvertTo-Json
} finally {
    [Environment]::SetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', $previousEnvironment, 'Process')
    $password.Dispose(); $passwordText = $null
    # Only remove this invocation's generated, GUID-named QA directory.
    $resolvedCase = [IO.Path]::GetFullPath($caseDirectory)
    $rootPrefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedCase.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolvedCase) -notmatch '^signing-qa-[0-9a-f]{32}$') { throw 'QA cleanup target escaped its generated directory' }
    Remove-Item -LiteralPath $resolvedCase -Recurse
}
