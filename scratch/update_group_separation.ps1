# 1. Update StudentInGroupDTO.cs
$dtoPath = "H:\.net projects\DarV2\DarV2\DTOs\Student\StudentInGroupDTO.cs"
$dtoText = [IO.File]::ReadAllText($dtoPath)
if (-not $dtoText.Contains("public bool IsActive")) {
    $dtoText = $dtoText.Replace("public Models.Gender? Gender { get; set; }", "public Models.Gender? Gender { get; set; }`r`n        public bool IsActive { get; set; } = true;")
    [IO.File]::WriteAllText($dtoPath, $dtoText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentInGroupDTO.cs with IsActive"
} else {
    Write-Host "StudentInGroupDTO.cs already has IsActive"
}

# 2. Update GroupService.cs
$grpSvcPath = "H:\.net projects\DarV2\DarV2\Service\Group\GroupService.cs"
$grpText = [IO.File]::ReadAllText($grpSvcPath)
if (-not $grpText.Contains("IsActive = student.IsActive")) {
    $grpText = $grpText.Replace("Gender = student.Gender,", "Gender = student.Gender,`r`n                        IsActive = student.IsActive,")
    [IO.File]::WriteAllText($grpSvcPath, $grpText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated GroupService.cs with student.IsActive"
} else {
    Write-Host "GroupService.cs already has IsActive"
}

# 3. Update StudentFeeViewDTO.cs
$feeDtoPath = "H:\.net projects\DarV2\DarV2\DTOs\StudentFee\StudentFeeViewDTO.cs"
$feeDtoText = [IO.File]::ReadAllText($feeDtoPath)
if (-not $feeDtoText.Contains("public bool IsStudentActive")) {
    $feeDtoText = $feeDtoText.Replace("public bool IsPermanentlyExempted { get; set; }", "public bool IsPermanentlyExempted { get; set; }`r`n        public bool IsStudentActive { get; set; } = true;")
    [IO.File]::WriteAllText($feeDtoPath, $feeDtoText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentFeeViewDTO.cs with IsStudentActive"
} else {
    Write-Host "StudentFeeViewDTO.cs already has IsStudentActive"
}

# 4. Update StudentFeeService.cs
$feeSvcPath = "H:\.net projects\DarV2\DarV2\Service\StudentFee\StudentFeeService.cs"
$feeSvcText = [IO.File]::ReadAllText($feeSvcPath)
if (-not $feeSvcText.Contains("IsStudentActive = sf.Student.IsActive")) {
    $feeSvcText = $feeSvcText.Replace("IsPermanentlyExempted = sf.Student.IsFeeExempted", "IsPermanentlyExempted = sf.Student.IsFeeExempted,`r`n                    IsStudentActive = sf.Student.IsActive")
    [IO.File]::WriteAllText($feeSvcPath, $feeSvcText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentFeeService.cs with IsStudentActive"
} else {
    Write-Host "StudentFeeService.cs already has IsStudentActive"
}
