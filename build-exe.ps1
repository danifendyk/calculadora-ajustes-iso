$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$compiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path -LiteralPath $compiler)) {
    throw 'No se encontró el compilador de .NET Framework.'
}
& $compiler /nologo /target:winexe /optimize+ /reference:System.Windows.Forms.dll "/out:$root\Calculadora Ajustes ISO.exe" "$root\launcher\Program.cs"
if ($LASTEXITCODE -ne 0) { throw "El compilador terminó con código $LASTEXITCODE" }
Write-Output "Ejecutable generado: $root\Calculadora Ajustes ISO.exe"
