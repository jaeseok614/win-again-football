#Requires -Version 7.2
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BundlePath,
    [Parameter(Mandatory)][string]$ExpectedBundleSha256,
    [Parameter(Mandatory)][string]$OutputPath,
    [Parameter(Mandatory)][string]$JavaHome,
    [Parameter(Mandatory)][string]$KeyStorePath,
    [string]$KeyAlias = 'winagain-upload',
    [switch]$CreateUploadKey,
    [Security.SecureString]$StorePassword
)

# Run locally. No passwords, private keys or environment dumps enter the report.
# The key stays outside the project; this script never uploads any file.
$ErrorActionPreference = 'Stop'
$bundleFile = [IO.Path]::GetFullPath($BundlePath)
$outputFile = [IO.Path]::GetFullPath($OutputPath)
$keyFile = [IO.Path]::GetFullPath($KeyStorePath)
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$projectPrefix = $projectRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if ($keyFile.StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw '업로드 키는 프로젝트 폴더 밖에 보관하세요.' }
if (-not (Test-Path -LiteralPath $bundleFile -PathType Leaf)) { throw '서명할 AAB 파일을 찾을 수 없습니다.' }
if ($bundleFile -eq $outputFile -or (Test-Path -LiteralPath $outputFile)) { throw '원본 또는 기존 출력 파일을 덮어쓰지 않습니다. 새 출력 경로를 선택하세요.' }
$bundleDigest = (Get-FileHash -LiteralPath $bundleFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ExpectedBundleSha256 -notmatch '^[0-9a-fA-F]{64}$' -or $bundleDigest -ne $ExpectedBundleSha256.ToLowerInvariant()) { throw '검증한 AAB의 SHA-256과 일치하지 않습니다.' }
$keytool = Join-Path $JavaHome 'bin/keytool.exe'
$jarsigner = Join-Path $JavaHome 'bin/jarsigner.exe'
if (-not (Test-Path -LiteralPath $keytool) -or -not (Test-Path -LiteralPath $jarsigner)) { throw '공식 JDK의 keytool과 jarsigner가 필요합니다.' }
if ($CreateUploadKey -and (Test-Path -LiteralPath $keyFile)) { throw '기존 키를 덮어쓰지 않습니다. 기존 키로 서명하거나 새 경로를 선택하세요.' }
if (-not $CreateUploadKey -and -not (Test-Path -LiteralPath $keyFile -PathType Leaf)) { throw '기존 업로드 키를 찾을 수 없습니다.' }

$passwordPointer = [IntPtr]::Zero
$confirmationPointer = [IntPtr]::Zero
$temporaryBundle = Join-Path ([IO.Path]::GetDirectoryName($outputFile)) ('.signing-' + [Guid]::NewGuid().ToString('N') + '.aab')
$previousPassword = [Environment]::GetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', 'Process')
try {
    $interactivePassword = $null -eq $StorePassword
    if ($interactivePassword) { $StorePassword = Read-Host '업로드 키 암호 (화면이나 로그에 표시되지 않습니다)' -AsSecureString }
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($StorePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ($CreateUploadKey) {
        if ($plainPassword.Length -lt 12 -or $plainPassword -match '[^\x21-\x7e]') { throw '새 키 암호는 공백 없는 영문·숫자·기호 12자 이상으로 정하세요.' }
        if ($interactivePassword) {
            $confirmation = Read-Host '같은 암호를 한 번 더 입력하세요' -AsSecureString
            $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
            if ($plainPassword -cne [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)) { throw '두 암호가 다릅니다. 키는 만들지 않았습니다.' }
        }
    }
    [Environment]::SetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', $plainPassword, 'Process')
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($outputFile)) | Out-Null
    if ($CreateUploadKey) {
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($keyFile)) | Out-Null
        $keyOutput = & $keytool '-J-Dfile.encoding=UTF-8' -genkeypair -keystore $keyFile -storetype PKCS12 -alias $KeyAlias -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 -dname 'CN=이번생 게임즈, C=KR' -storepass:env WIN_AGAIN_SIGNING_PASSWORD -keypass:env WIN_AGAIN_SIGNING_PASSWORD 2>&1
        if ($LASTEXITCODE -ne 0) { throw '업로드 키 생성에 실패했습니다.' }
        Write-Host '업로드 키 생성 완료. 키와 암호를 별도로 보관하세요.'
    }
    $signOutput = & $jarsigner '-J-Dfile.encoding=UTF-8' -keystore $keyFile -storepass:env WIN_AGAIN_SIGNING_PASSWORD -keypass:env WIN_AGAIN_SIGNING_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 -signedjar $temporaryBundle $bundleFile $KeyAlias 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'AAB 서명에 실패했습니다. 원본 AAB와 기존 키는 유지됩니다.' }
    # Trust only the owner's known local upload identity. Strict verification also
    # rejects unsigned additions; Play separately checks the uploaded identity.
    $verification = & $jarsigner '-J-Dfile.encoding=UTF-8' -verify -strict -verbose -certs -keystore $keyFile -storepass:env WIN_AGAIN_SIGNING_PASSWORD $temporaryBundle $KeyAlias 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'JDK가 서명한 AAB를 검증하지 못했습니다.' }
    $verification | Set-Content -LiteralPath ($outputFile + '.verify.txt') -Encoding utf8
    $certificateFile = $outputFile + '.upload-certificate.pem'
    $certificateOutput = & $keytool '-J-Dfile.encoding=UTF-8' -exportcert -rfc -keystore $keyFile -alias $KeyAlias -storepass:env WIN_AGAIN_SIGNING_PASSWORD -file $certificateFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw '공개 업로드 인증서를 확인하지 못했습니다.' }
    $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::CreateFromPem([IO.File]::ReadAllText($certificateFile))
    try {
        if ((Get-FileHash -LiteralPath $bundleFile -Algorithm SHA256).Hash.ToLowerInvariant() -ne $bundleDigest) { throw '서명 도중 원본 AAB가 변경되어 출력하지 않았습니다.' }
        [IO.File]::Move($temporaryBundle, $outputFile)
        $report = [ordered]@{
            schema = 1
            unsignedSha256 = $bundleDigest
            signedSha256 = (Get-FileHash -LiteralPath $outputFile -Algorithm SHA256).Hash.ToLowerInvariant()
            signedBytes = (Get-Item -LiteralPath $outputFile).Length
            uploadCertificateSha256 = $certificate.GetCertHashString([Security.Cryptography.HashAlgorithmName]::SHA256).ToLowerInvariant()
            jdkSignatureVerified = $true
            privateKeyUploaded = $false
            playSubmitted = $false
        }
        $report | ConvertTo-Json | Set-Content -LiteralPath ($outputFile + '.verification.json') -Encoding utf8
        $report | ConvertTo-Json
    } finally { $certificate.Dispose() }
} finally {
    [Environment]::SetEnvironmentVariable('WIN_AGAIN_SIGNING_PASSWORD', $previousPassword, 'Process')
    $plainPassword = $null
    if ($interactivePassword -and $StorePassword -is [Security.SecureString]) { $StorePassword.Dispose() }
    if ($confirmation -is [Security.SecureString]) { $confirmation.Dispose() }
    if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    if ($confirmationPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer) }
    if (Test-Path -LiteralPath $temporaryBundle) { Remove-Item -LiteralPath $temporaryBundle }
}
