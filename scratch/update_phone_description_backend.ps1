$baseDir = "H:\.net projects\DarV2\DarV2"

# 1. Update Phone.cs
$phonePath = Join-Path $baseDir "Models\Phones\Phone.cs"
$phoneText = [IO.File]::ReadAllText($phonePath)
if (-not $phoneText.Contains("public string? Description")) {
    $phoneText = $phoneText.Replace("public string Number { get; set; }", "public string Number { get; set; }`r`n        public string? Description { get; set; }")
    [IO.File]::WriteAllText($phonePath, $phoneText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated Phone.cs"
} else {
    Write-Host "Phone.cs already has Description"
}

# 2. Update PhoneViewDTO.cs
$viewDtoPath = Join-Path $baseDir "DTOs\Phone\PhoneViewDTO.cs"
$viewDtoText = [IO.File]::ReadAllText($viewDtoPath)
if (-not $viewDtoText.Contains("public string? Description")) {
    $viewDtoText = $viewDtoText.Replace("public string Number { get; set; }", "public string Number { get; set; }`r`n        public string? Description { get; set; }")
    [IO.File]::WriteAllText($viewDtoPath, $viewDtoText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated PhoneViewDTO.cs"
} else {
    Write-Host "PhoneViewDTO.cs already has Description"
}

# 3. Update PhoneAddDTO.cs
$addDtoPath = Join-Path $baseDir "DTOs\Phone\PhoneAddDTO.cs"
$addDtoText = [IO.File]::ReadAllText($addDtoPath)
if (-not $addDtoText.Contains("public string? Description")) {
    $addDtoText = $addDtoText.Replace("public string Number { get; set; }", "public string Number { get; set; }`r`n        public string? Description { get; set; }")
    [IO.File]::WriteAllText($addDtoPath, $addDtoText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated PhoneAddDTO.cs"
} else {
    Write-Host "PhoneAddDTO.cs already has Description"
}

# 4. Update StudentAddDTO.cs
$stdAddDtoPath = Join-Path $baseDir "DTOs\Student\StudentAddDTO.cs"
$stdAddDtoText = [IO.File]::ReadAllText($stdAddDtoPath)
if (-not $stdAddDtoText.Contains("PhoneDescriptions")) {
    $stdAddDtoText = $stdAddDtoText.Replace("public List<string>? PhoneNumbers { get; set; } = new List<string>();", "public List<string>? PhoneNumbers { get; set; } = new List<string>();`r`n        public List<string>? PhoneDescriptions { get; set; } = new List<string>();")
    [IO.File]::WriteAllText($stdAddDtoPath, $stdAddDtoText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentAddDTO.cs"
} else {
    Write-Host "StudentAddDTO.cs already has PhoneDescriptions"
}

# 5. Update IStudentService.cs
$iServicePath = Join-Path $baseDir "Service\Student\IStudentService.cs"
$iServiceText = [IO.File]::ReadAllText($iServicePath)
$iServiceText = $iServiceText.Replace("Task<bool> CreatePhoneAsync(int studentId, string number);", "Task<bool> CreatePhoneAsync(int studentId, string number, string? description = null);")
$iServiceText = $iServiceText.Replace("Task<bool> UpdatePhoneAsync(int phoneId, string number);", "Task<bool> UpdatePhoneAsync(int phoneId, string number, string? description = null);")
[IO.File]::WriteAllText($iServicePath, $iServiceText, [System.Text.Encoding]::UTF8)
Write-Host "Updated IStudentService.cs"

# 6. Update StudentService.cs
$servicePath = Join-Path $baseDir "Service\Student\StudentService.cs"
$serviceText = [IO.File]::ReadAllText($servicePath)

# Update PhoneViewDTO mappings
$serviceText = $serviceText.Replace("new PhoneViewDTO { Id = p.Id, Number = p.Number }", "new PhoneViewDTO { Id = p.Id, Number = p.Number, Description = p.Description }")

# Update CreateAsync phone insertion loop
$oldPhoneLoop = @"
            if (dto.PhoneNumbers != null)
            {
                foreach (var number in dto.PhoneNumbers)
                {
                    await _uow.Phones.AddAsync(new Phone { Number = number, StudentId = student.Id });
                }
            }
"@ -replace "`r`n", "`n"

$newPhoneLoop = @"
            if (dto.PhoneNumbers != null)
            {
                for (int i = 0; i < dto.PhoneNumbers.Count; i++)
                {
                    var number = dto.PhoneNumbers[i];
                    var desc = (dto.PhoneDescriptions != null && i < dto.PhoneDescriptions.Count) ? dto.PhoneDescriptions[i] : null;
                    await _uow.Phones.AddAsync(new Phone { Number = number, Description = desc, StudentId = student.Id });
                }
            }
"@ -replace "`r`n", "`n"

$serviceNorm = $serviceText -replace "`r`n", "`n"
if ($serviceNorm.Contains($oldPhoneLoop)) {
    $serviceNorm = $serviceNorm.Replace($oldPhoneLoop, $newPhoneLoop)
    Write-Host "Updated CreateAsync phone loop in StudentService.cs"
}

# Update CreatePhoneAsync method signature and impl
$oldCreatePhone = @"
        public async Task<bool> CreatePhoneAsync(int studentId, string number)
        {
            var student = await _uow.Students.GetStudentAsync(studentId);
            if (student == null) throw new Exception("الطالب غير موجود");
            student.Phones.Add(new Phone { Number = number });
            await _uow.SaveAsync();
            return true;
        }
"@ -replace "`r`n", "`n"

# In case the Arabic string is garbled in original file:
$patternCreatePhone = "public async Task<bool> CreatePhoneAsync\(int studentId, string number\)\s*\{\s*var student = await _uow\.Students\.GetStudentAsync\(studentId\);\s*if \(student == null\) throw new Exception\([^\)]+\);\s*student\.Phones\.Add\(new Phone \{ Number = number \}\);\s*await _uow\.SaveAsync\(\);\s*return true;\s*\}"

$newCreatePhoneImpl = @"
        public async Task<bool> CreatePhoneAsync(int studentId, string number, string? description = null)
        {
            var student = await _uow.Students.GetStudentAsync(studentId);
            if (student == null) throw new Exception("الطالب غير موجود");
            student.Phones.Add(new Phone { Number = number, Description = description });
            await _uow.SaveAsync();
            return true;
        }
"@ -replace "`r`n", "`n"

$serviceNorm = [regex]::Replace($serviceNorm, $patternCreatePhone, $newCreatePhoneImpl)

# Update UpdatePhoneAsync method signature and impl
$patternUpdatePhone = "public async Task<bool> UpdatePhoneAsync\(int phoneId, string number\)\s*\{\s*var phone = await _uow\.Phones\.GetByIdAsync\(phoneId\);\s*if \(phone == null\) throw new Exception\([^\)]+\);\s*phone\.Number = number;\s*_uow\.Phones\.Update\(phone\);\s*await _uow\.SaveAsync\(\);\s*return true;\s*\}"

$newUpdatePhoneImpl = @"
        public async Task<bool> UpdatePhoneAsync(int phoneId, string number, string? description = null)
        {
            var phone = await _uow.Phones.GetByIdAsync(phoneId);
            if (phone == null) throw new Exception("رقم الهاتف غير موجود");
            phone.Number = number;
            phone.Description = description;
            _uow.Phones.Update(phone);
            await _uow.SaveAsync();
            return true;
        }
"@ -replace "`r`n", "`n"

$serviceNorm = [regex]::Replace($serviceNorm, $patternUpdatePhone, $newUpdatePhoneImpl)

[IO.File]::WriteAllText($servicePath, ($serviceNorm -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
Write-Host "Updated StudentService.cs"

# 7. Update StudentController.cs
$controllerPath = Join-Path $baseDir "Controllers\StudentController.cs"
$controllerText = [IO.File]::ReadAllText($controllerPath)
$controllerText = $controllerText.Replace("public async Task<IActionResult> AddPhone(int studetId,string phone)", "public async Task<IActionResult> AddPhone(int studetId, string phone, string? description = null)")
$controllerText = $controllerText.Replace("var ok = await _studentService.CreatePhoneAsync(studetId, phone);", "var ok = await _studentService.CreatePhoneAsync(studetId, phone, description);")
$controllerText = $controllerText.Replace("public async Task<IActionResult> UpdatePhone(int phoneId, string phone)", "public async Task<IActionResult> UpdatePhone(int phoneId, string phone, string? description = null)")
$controllerText = $controllerText.Replace("var ok = await _studentService.UpdatePhoneAsync(phoneId, phone);", "var ok = await _studentService.UpdatePhoneAsync(phoneId, phone, description);")
[IO.File]::WriteAllText($controllerPath, $controllerText, [System.Text.Encoding]::UTF8)
Write-Host "Updated StudentController.cs"
