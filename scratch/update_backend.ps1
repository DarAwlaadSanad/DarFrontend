$studentServicePath = "H:\.net projects\DarV2\DarV2\Service\Student\StudentService.cs"
$text = [IO.File]::ReadAllText($studentServicePath)

# 1. Update CreateAsync
$oldCreate = @"
            var lastCode = await _uow.Students
                .Query()
                .OrderByDescending(s => s.Id)
                .Select(s => s.Code)
                .FirstOrDefaultAsync();

            int nextNumber = 1;

            if (lastCode is not null)
            {
                var numberPart = lastCode.Replace("STD-", "");
                if (int.TryParse(numberPart, out var lastNumber))
                    nextNumber = lastNumber + 1;
            }

            var code = `$"STD-{nextNumber:D4}";

            var codeExists = await _uow.Students.Query().AnyAsync(s => s.Code == code);
            if (codeExists)
                throw new InvalidOperationException(`$"Code {code} already exists, try again");
"@

$newCreate = @"
            var lastCode = await _uow.Students
                .Query()
                .OrderByDescending(s => s.Id)
                .Select(s => s.Code)
                .FirstOrDefaultAsync();

            int nextNumber = 1;

            if (lastCode is not null)
            {
                var numberPart = lastCode.Replace("STD-", "").Trim();
                if (int.TryParse(numberPart, out var lastNumber))
                    nextNumber = lastNumber + 1;
            }

            var code = `"{nextNumber:D4}";

            var codeExists = await _uow.Students.Query().AnyAsync(s => s.Code == code);
            if (codeExists)
            {
                var allCodes = await _uow.Students.Query().Select(s => s.Code).ToListAsync();
                var maxNum = allCodes
                    .Select(c => int.TryParse(c?.Replace("STD-", "").Trim(), out var n) ? n : 0)
                    .DefaultIfEmpty(0)
                    .Max();
                nextNumber = maxNum + 1;
                code = `"{nextNumber:D4}";
            }
"@

# Normalize line endings for replacement
$normalizedText = $text -replace "`r`n", "`n"
$normalizedOldCreate = $oldCreate -replace "`r`n", "`n"
$normalizedNewCreate = $newCreate -replace "`r`n", "`n"

if ($normalizedText.Contains($normalizedOldCreate)) {
    $normalizedText = $normalizedText.Replace($normalizedOldCreate, $normalizedNewCreate)
    Write-Host "Replaced CreateAsync code generation successfully."
} else {
    Write-Host "Warning: CreateAsync pattern not found."
}

# 2. Update LoginAsync
$oldLogin = @"
            Code = Code?.Trim() ?? string.Empty;
            Password = Password?.Trim() ?? string.Empty;

            var student = await _uow.Students
                                    .FirstOrDefaultAsync(s => s.Code == Code
                                                           && s.IsActive);
"@

$newLogin = @"
            Code = Code?.Trim() ?? string.Empty;
            Password = Password?.Trim() ?? string.Empty;

            var paddedCode = int.TryParse(Code, out var cNum) ? `"{cNum:D4}" : Code;

            var student = await _uow.Students
                                    .FirstOrDefaultAsync(s => (s.Code == Code || s.Code == paddedCode)
                                                           && s.IsActive);
"@

$normalizedOldLogin = $oldLogin -replace "`r`n", "`n"
$normalizedNewLogin = $newLogin -replace "`r`n", "`n"

if ($normalizedText.Contains($normalizedOldLogin)) {
    $normalizedText = $normalizedText.Replace($normalizedOldLogin, $normalizedNewLogin)
    Write-Host "Replaced LoginAsync code matching successfully."
} else {
    Write-Host "Warning: LoginAsync pattern not found."
}

# Convert back to Windows CRLF and save
$finalText = $normalizedText -replace "`n", "`r`n"
[IO.File]::WriteAllText($studentServicePath, $finalText, [System.Text.Encoding]::UTF8)
Write-Host "Saved StudentService.cs."

# 3. Update ExportService.cs
$exportServicePath = "H:\.net projects\DarV2\DarV2\Service\Export\ExportService.cs"
$expText = [IO.File]::ReadAllText($exportServicePath)
$expNorm = $expText -replace "`r`n", "`n"

$oldExportPattern = @"
                    // Pre-fetch last code to generate new codes
                    var lastStudentCodeStr = await _uow.Students.Query()
                        .Where(s => s.Code != null && s.Code.StartsWith("STD-"))
                        .OrderByDescending(s => s.Id)
                        .Select(s => s.Code)
                        .FirstOrDefaultAsync();

                    int nextCodeNumber = 1;
                    if (lastStudentCodeStr != null && lastStudentCodeStr.Length >= 8)
                    {
                        if (int.TryParse(lastStudentCodeStr.Substring(4), out int lastNum))
                        {
                            nextCodeNumber = lastNum + 1;
                        }
                    }
"@
$newExportPattern = @"
                    // Pre-fetch last code to generate new codes
                    var lastStudentCodeStr = await _uow.Students.Query()
                        .OrderByDescending(s => s.Id)
                        .Select(s => s.Code)
                        .FirstOrDefaultAsync();

                    int nextCodeNumber = 1;
                    if (lastStudentCodeStr != null)
                    {
                        var numStr = lastStudentCodeStr.Replace("STD-", "").Trim();
                        if (int.TryParse(numStr, out int lastNum))
                        {
                            nextCodeNumber = lastNum + 1;
                        }
                    }
"@

$oldExportCode = 'string newCode = $"STD-{nextCodeNumber:D4}";'
$newExportCode = 'string newCode = $"{nextCodeNumber:D4}";'

$normOldExpPattern = $oldExportPattern -replace "`r`n", "`n"
$normNewExpPattern = $newExportPattern -replace "`r`n", "`n"

if ($expNorm.Contains($normOldExpPattern)) {
    $expNorm = $expNorm.Replace($normOldExpPattern, $normNewExpPattern)
    Write-Host "Replaced ExportService lastCode logic successfully."
} else {
    Write-Host "Warning: ExportService lastCode pattern not found."
}

if ($expNorm.Contains($oldExportCode)) {
    $expNorm = $expNorm.Replace($oldExportCode, $newExportCode)
    Write-Host "Replaced ExportService newCode successfully."
} else {
    Write-Host "Warning: ExportService newCode not found."
}

$finalExpText = $expNorm -replace "`n", "`r`n"
[IO.File]::WriteAllText($exportServicePath, $finalExpText, [System.Text.Encoding]::UTF8)
Write-Host "Saved ExportService.cs."
