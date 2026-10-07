$file = "H:\.net projects\DarV2\DarV2\Controllers\AcademicYearController.cs"
$content = Get-Content $file -Raw
$content = $content -replace '\[Authorize\(Policy = Permissions\.ViewAcademicYears\)\]\s*public async Task<IActionResult> GetAll\(\)', "[AllowAnonymous]`r`n        public async Task<IActionResult> GetAll()"
Set-Content $file -Value $content -Encoding utf8
Write-Host "AcademicYearController.GetAll updated to [AllowAnonymous]"

# Also add public academic years to WaitingStudentsController for certainty
$wsFile = "H:\.net projects\DarV2\DarV2\Controllers\WaitingStudentsController.cs"
$wsContent = Get-Content $wsFile -Raw
if ($wsContent -notmatch 'public-academic-years') {
    $endpoint = @"
        [HttpGet("public-academic-years")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicAcademicYears([FromServices] DarV2.Service.IAcademicYearService academicYearService)
        {
            var items = await academicYearService.GetAllAsync();
            return Ok(items);
        }
"@
    $wsContent = $wsContent -replace '(\[HttpPost\]\s*\[AllowAnonymous\])', "$endpoint`r`n`r`n        `$1"
    Set-Content $wsFile -Value $wsContent -Encoding utf8
    Write-Host "Added public-academic-years endpoint to WaitingStudentsController"
}

# Build .NET project
cd "H:\.net projects\DarV2\DarV2"
dotnet build
