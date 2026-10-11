$ErrorActionPreference = "Stop"

# 1. Update StudentGroup.cs
$studentGroupPath = "H:\.net projects\DarV2\DarV2\Models\StudentGroup\StudentGroup.cs"
$sgCode = @"
namespace DarV2.Models
{
    public class StudentGroup 
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public Student Student { get; set; }

        public int GroupId { get; set; }
        public Group Group { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
        public DateTime? LeftDate { get; set; }
        public string? SeparationReason { get; set; }
    }
}
"@
[IO.File]::WriteAllText($studentGroupPath, $sgCode, [System.Text.Encoding]::UTF8)
Write-Host "1. Updated StudentGroup.cs"

# 2. Update StudentInGroupDTO.cs
$dtoPath = "H:\.net projects\DarV2\DarV2\DTOs\Student\StudentInGroupDTO.cs"
$dtoCode = @"
namespace DarV2.DTOs
{
    public class StudentInGroupDTO
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; }
        public Models.Gender? Gender { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? JoinedDate { get; set; }
        public DateTime? LeftDate { get; set; }
        public string? SeparationReason { get; set; }
        public bool IsStudentActive { get; set; } = true;
        public Dictionary<int, SessionRecordDTO> Records { get; set; } = new();
        public int TotalPresent { get; set; }
        public decimal TotalEvaluation { get; set; }
    }
}
"@
[IO.File]::WriteAllText($dtoPath, $dtoCode, [System.Text.Encoding]::UTF8)
Write-Host "2. Updated StudentInGroupDTO.cs"

# 3. Create StudentTransferDTO.cs
$transferDtoPath = "H:\.net projects\DarV2\DarV2\DTOs\Student\StudentTransferDTO.cs"
$transferDtoCode = @"
namespace DarV2.DTOs
{
    public class StudentTransferDTO
    {
        public int StudentId { get; set; }
        public int FromGroupId { get; set; }
        public int ToGroupId { get; set; }
        public string? Reason { get; set; }
        public bool TransferCurrentMonthFee { get; set; } = true;
    }

    public class StudentGroupStatusDTO
    {
        public int StudentId { get; set; }
        public int GroupId { get; set; }
        public bool IsActive { get; set; }
        public string? Reason { get; set; }
        public bool CancelUnpaidFee { get; set; } = false;
    }
}
"@
[IO.File]::WriteAllText($transferDtoPath, $transferDtoCode, [System.Text.Encoding]::UTF8)
Write-Host "3. Created StudentTransferDTO.cs"

# 4. Update StudentFeeViewDTO.cs
$feeDtoPath = "H:\.net projects\DarV2\DarV2\DTOs\StudentFee\StudentFeeViewDTO.cs"
$feeDtoCode = @"
namespace DarV2.DTOs
{
    public class StudentFeeViewDTO
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; }
        public Models.Gender? Gender { get; set; }
        public int GroupId { get; set; }
        public string GroupName { get; set; }
        public decimal RequiredAmount { get; set; }
        public decimal AmountPaid { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public DateOnly? PaymentDate { get; set; }
        public bool IsExempted { get; set; }
        public string? ExemptionReason { get; set; }
        public bool IsPermanentlyExempted { get; set; }
        public bool IsStudentActive { get; set; } = true;
        public bool IsActiveInGroup { get; set; } = true;
    }
}
"@
[IO.File]::WriteAllText($feeDtoPath, $feeDtoCode, [System.Text.Encoding]::UTF8)
Write-Host "4. Updated StudentFeeViewDTO.cs"

# 5. Update IStudentService.cs
$iStudentSvcPath = "H:\.net projects\DarV2\DarV2\Service\Student\IStudentService.cs"
$iStudentSvcText = [IO.File]::ReadAllText($iStudentSvcPath)
if (-not $iStudentSvcText.Contains("ChangeStudentGroupStatusAsync")) {
    $iStudentSvcText = $iStudentSvcText.Replace(
        "Task<bool> UnAssigenGroupToStudent(int studentId, int groupId);",
        "Task<bool> UnAssigenGroupToStudent(int studentId, int groupId);`r`n        Task<bool> ChangeStudentGroupStatusAsync(StudentGroupStatusDTO dto);`r`n        Task<bool> TransferStudentAsync(StudentTransferDTO dto);"
    )
    [IO.File]::WriteAllText($iStudentSvcPath, $iStudentSvcText, [System.Text.Encoding]::UTF8)
    Write-Host "5. Updated IStudentService.cs"
} else {
    Write-Host "5. IStudentService.cs already has methods"
}

# 6. Update StudentService.cs
$studentSvcPath = "H:\.net projects\DarV2\DarV2\Service\Student\StudentService.cs"
$studentSvcText = [IO.File]::ReadAllText($studentSvcPath)

# Reactivate on assign if exists
$oldAssign = @"
            var alreadyAssigned = await _uow.StudentGroups
                .Query()
                .AnyAsync(sg =>
                    sg.StudentId == studentId &&
                    sg.GroupId == groupId);

            if (alreadyAssigned)
                return false;

            await _uow.StudentGroups.AddAsync(new StudentGroup
            {
                StudentId = studentId,
                GroupId = groupId
            });

            await _uow.SaveAsync();

            return true;
"@

$newAssign = @"
            var existingSg = await _uow.StudentGroups
                .Query()
                .FirstOrDefaultAsync(sg =>
                    sg.StudentId == studentId &&
                    sg.GroupId == groupId);

            if (existingSg != null)
            {
                if (!existingSg.IsActive)
                {
                    existingSg.IsActive = true;
                    existingSg.LeftDate = null;
                    existingSg.SeparationReason = null;
                    _uow.StudentGroups.Update(existingSg);
                    await _uow.SaveAsync();
                    return true;
                }
                return false;
            }

            await _uow.StudentGroups.AddAsync(new StudentGroup
            {
                StudentId = studentId,
                GroupId = groupId,
                IsActive = true,
                JoinedDate = DateTime.UtcNow
            });

            await _uow.SaveAsync();

            return true;
"@

# Replace assign logic if present
$normalizedStudentSvc = $studentSvcText -replace "`r`n", "`n"
$normOldAssign = $oldAssign -replace "`r`n", "`n"
$normNewAssign = $newAssign -replace "`r`n", "`n"

if ($normalizedStudentSvc.Contains($normOldAssign)) {
    $normalizedStudentSvc = $normalizedStudentSvc.Replace($normOldAssign, $normNewAssign)
}

# Add ChangeStudentGroupStatusAsync and TransferStudentAsync
if (-not $normalizedStudentSvc.Contains("ChangeStudentGroupStatusAsync")) {
    $additionalMethods = @"

        public async Task<bool> ChangeStudentGroupStatusAsync(StudentGroupStatusDTO dto)
        {
            var sg = await _uow.StudentGroups.Query()
                .FirstOrDefaultAsync(s => s.StudentId == dto.StudentId && s.GroupId == dto.GroupId);
            if (sg == null) return false;

            sg.IsActive = dto.IsActive;
            if (!dto.IsActive)
            {
                sg.LeftDate = DateTime.UtcNow;
                sg.SeparationReason = dto.Reason;

                if (dto.CancelUnpaidFee)
                {
                    var now = DateTime.UtcNow;
                    var unpaidFees = await _uow.StudentFees.Query()
                        .Where(sf => sf.StudentId == dto.StudentId && sf.GroupId == dto.GroupId && sf.Month == now.Month && sf.Year == now.Year && sf.AmountPaid == 0)
                        .ToListAsync();
                    foreach (var fee in unpaidFees)
                    {
                        _uow.StudentFees.Remove(fee);
                    }
                }
            }
            else
            {
                sg.LeftDate = null;
                sg.SeparationReason = null;
            }

            _uow.StudentGroups.Update(sg);
            await _uow.SaveAsync();
            return true;
        }

        public async Task<bool> TransferStudentAsync(StudentTransferDTO dto)
        {
            if (dto.FromGroupId == dto.ToGroupId) return false;

            var studentExists = await _uow.Students.Query().AnyAsync(s => s.Id == dto.StudentId);
            var toGroup = await _uow.Groups.GetByIdAsync(dto.ToGroupId);
            if (!studentExists || toGroup == null) return false;

            // 1. Mark fromGroup as inactive
            var fromSg = await _uow.StudentGroups.Query()
                .FirstOrDefaultAsync(sg => sg.StudentId == dto.StudentId && sg.GroupId == dto.FromGroupId);
            if (fromSg != null)
            {
                fromSg.IsActive = false;
                fromSg.LeftDate = DateTime.UtcNow;
                fromSg.SeparationReason = !string.IsNullOrWhiteSpace(dto.Reason)
                    ? dto.Reason
                    : `$"تم النقل إلى حلقة {toGroup.Name}";
                _uow.StudentGroups.Update(fromSg);
            }

            // 2. Add or reactivate in toGroup
            var toSg = await _uow.StudentGroups.Query()
                .FirstOrDefaultAsync(sg => sg.StudentId == dto.StudentId && sg.GroupId == dto.ToGroupId);
            if (toSg == null)
            {
                await _uow.StudentGroups.AddAsync(new StudentGroup
                {
                    StudentId = dto.StudentId,
                    GroupId = dto.ToGroupId,
                    IsActive = true,
                    JoinedDate = DateTime.UtcNow
                });
            }
            else
            {
                toSg.IsActive = true;
                toSg.LeftDate = null;
                toSg.SeparationReason = null;
                _uow.StudentGroups.Update(toSg);
            }

            // 3. Handle current month fee transfer if requested
            if (dto.TransferCurrentMonthFee)
            {
                var now = DateTime.UtcNow;
                var fromFee = await _uow.StudentFees.Query()
                    .FirstOrDefaultAsync(sf => sf.StudentId == dto.StudentId && sf.GroupId == dto.FromGroupId && sf.Month == now.Month && sf.Year == now.Year);
                var toFee = await _uow.StudentFees.Query()
                    .FirstOrDefaultAsync(sf => sf.StudentId == dto.StudentId && sf.GroupId == dto.ToGroupId && sf.Month == now.Month && sf.Year == now.Year);

                var toPlan = await _uow.FeePlans.Query().FirstOrDefaultAsync(p => p.GroupId == dto.ToGroupId);

                if (fromFee != null)
                {
                    if (toFee == null)
                    {
                        fromFee.GroupId = dto.ToGroupId;
                        if (toPlan != null && fromFee.AmountPaid == 0)
                        {
                            fromFee.RequiredAmount = toPlan.Amount;
                        }
                        _uow.StudentFees.Update(fromFee);
                    }
                    else
                    {
                        if (fromFee.AmountPaid > 0)
                        {
                            toFee.AmountPaid = Math.Max(toFee.AmountPaid, fromFee.AmountPaid);
                            if (toFee.PaymentDate == null) toFee.PaymentDate = fromFee.PaymentDate;
                            _uow.StudentFees.Update(toFee);
                        }
                        _uow.StudentFees.Remove(fromFee);
                    }
                }
            }

            await _uow.SaveAsync();
            return true;
        }
"@
    $normUnassign = "public async Task<bool> UnAssigenGroupToStudent(int studentId, int groupId)"
    $unassignIdx = $normalizedStudentSvc.IndexOf($normUnassign)
    if ($unassignIdx -gt 0) {
        $endBraceIdx = $normalizedStudentSvc.IndexOf("return true;", $unassignIdx)
        $endBraceIdx = $normalizedStudentSvc.IndexOf("}", $endBraceIdx) + 1
        $normalizedStudentSvc = $normalizedStudentSvc.Substring(0, $endBraceIdx) + $additionalMethods + $normalizedStudentSvc.Substring($endBraceIdx)
    }
}

[IO.File]::WriteAllText($studentSvcPath, ($normalizedStudentSvc -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
Write-Host "6. Updated StudentService.cs"

# 7. Update StudentController.cs
$studentCtrlPath = "H:\.net projects\DarV2\DarV2\Controllers\StudentController.cs"
$studentCtrlText = [IO.File]::ReadAllText($studentCtrlPath)
if (-not $studentCtrlText.Contains("groupStatus")) {
    $ctrlMethods = @"
        [HttpPost("groupStatus")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> ChangeGroupStatus([FromBody] StudentGroupStatusDTO dto)
        {
            var ok = await _studentService.ChangeStudentGroupStatusAsync(dto);
            if (!ok) return BadRequest("تعذر تحديث حالة الطالب في المجموعة");
            return Ok(new { message = dto.IsActive ? "تم إعادة تنشيط الطالب في المجموعة" : "تم نقل الطالب للمنقطعين عن هذه المجموعة" });
        }

        [HttpPost("transferGroup")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> TransferGroup([FromBody] StudentTransferDTO dto)
        {
            var ok = await _studentService.TransferStudentAsync(dto);
            if (!ok) return BadRequest("تعذر نقل الطالب إلى المجموعة المحددة");
            return Ok(new { message = "تم نقل الطالب ومعالجة السجلات بنجاح" });
        }

"@
    $studentCtrlText = $studentCtrlText.Replace(
        "[HttpPost(""unAssainGroup"")]",
        $ctrlMethods + "        [HttpPost(""unAssainGroup"")]"
    )
    [IO.File]::WriteAllText($studentCtrlPath, $studentCtrlText, [System.Text.Encoding]::UTF8)
    Write-Host "7. Updated StudentController.cs"
} else {
    Write-Host "7. StudentController.cs already has groupStatus"
}

# 8. Update GroupService.cs
$grpSvcPath = "H:\.net projects\DarV2\DarV2\Service\Group\GroupService.cs"
$grpSvcText = [IO.File]::ReadAllText($grpSvcPath)

# Update MaleCount / FemaleCount in GetAllAsync
$grpSvcText = $grpSvcText.Replace(
    "MaleCount = g.StudentGroups?.Count(sg => sg.Student?.Gender == Gender.Male) ?? 0,",
    "MaleCount = g.StudentGroups?.Count(sg => sg.IsActive && sg.Student?.Gender == Gender.Male) ?? 0,"
)
$grpSvcText = $grpSvcText.Replace(
    "FemaleCount = g.StudentGroups?.Count(sg => sg.Student?.Gender == Gender.Female) ?? 0,",
    "FemaleCount = g.StudentGroups?.Count(sg => sg.IsActive && sg.Student?.Gender == Gender.Female) ?? 0,"
)

# Update StudentInGroupDTO mapping in GetByIdAsync
$oldMapping = @"
                    return new StudentInGroupDTO
                    {
                        StudentId = student.Id,
                        StudentName = student.FullName,
                        Gender = student.Gender,
                        IsActive = student.IsActive,
                        Records = records,
                        TotalPresent = presentCount,
                        TotalEvaluation = totalEvaluation??0,
                    };
"@

$newMapping = @"
                    var studentGroup = student.StudentGroups.FirstOrDefault(sg => sg.GroupId == groupId);
                    var isGroupActive = studentGroup != null ? studentGroup.IsActive : student.IsActive;

                    return new StudentInGroupDTO
                    {
                        StudentId = student.Id,
                        StudentName = student.FullName,
                        Gender = student.Gender,
                        IsActive = isGroupActive,
                        JoinedDate = studentGroup?.JoinedDate,
                        LeftDate = studentGroup?.LeftDate,
                        SeparationReason = studentGroup?.SeparationReason,
                        IsStudentActive = student.IsActive,
                        Records = records,
                        TotalPresent = presentCount,
                        TotalEvaluation = totalEvaluation??0,
                    };
"@

$normGrp = $grpSvcText -replace "`r`n", "`n"
$normOldM = $oldMapping -replace "`r`n", "`n"
$normNewM = $newMapping -replace "`r`n", "`n"

if ($normGrp.Contains($normOldM)) {
    $normGrp = $normGrp.Replace($normOldM, $normNewM)
}
[IO.File]::WriteAllText($grpSvcPath, ($normGrp -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
Write-Host "8. Updated GroupService.cs"

# 9. Update StudentFeeService.cs
$feeSvcPath = "H:\.net projects\DarV2\DarV2\Service\StudentFee\StudentFeeService.cs"
$feeSvcText = [IO.File]::ReadAllText($feeSvcPath)

# Add duplicate prevention and inactive check in GenerateForFeePlanAsync
$oldGen = @"
            foreach (var student in students)
            {
                var exists = await _uow.StudentFees.Query()
                    .AnyAsync(sf => sf.StudentId == student.Id && sf.GroupId == groupId
                                 && sf.Month == month && sf.Year == year && sf.RequiredAmount == feePlan.Amount);
                if (exists) continue;

                var existing = await _uow.StudentFees.Query()
                    .FirstOrDefaultAsync(sf => sf.StudentId == student.Id && sf.GroupId == groupId
                                            && sf.Month == month && sf.Year == year);

                if (existing != null)
                {
                    existing.RequiredAmount = feePlan.Amount;
                    // Apply permanent exemption if set on student
                    if (student.IsFeeExempted && !existing.IsExempted)
                    {
                        existing.IsExempted = true;
                        existing.ExemptionReason = student.FeeExemptionReason ?? "إعفاء دائم";
                    }
                    _uow.StudentFees.Update(existing);
                    await _uow.SaveAsync();
                    continue;
                }

                var sf = new StudentFee
                {
                    StudentId = student.Id,
                    RequiredAmount = feePlan.Amount,
                    GroupId = groupId,
                    Month = month,
                    Year = year,
                    AmountPaid = 0,
                    PaymentDate = null,
                    // Auto-exempt if student has a permanent exemption
                    IsExempted = student.IsFeeExempted,
                    ExemptionReason = student.IsFeeExempted ? (student.FeeExemptionReason ?? "إعفاء دائم") : null
                };

                await _uow.StudentFees.AddAsync(sf);
            }
"@

$newGen = @"
            foreach (var student in students)
            {
                var studentGroup = student.StudentGroups.FirstOrDefault(sg => sg.GroupId == groupId);
                // 1. Skip students who are separated/inactive in this group
                if (studentGroup != null && !studentGroup.IsActive)
                {
                    continue;
                }

                var exists = await _uow.StudentFees.Query()
                    .AnyAsync(sf => sf.StudentId == student.Id && sf.GroupId == groupId
                                 && sf.Month == month && sf.Year == year && sf.RequiredAmount == feePlan.Amount);
                if (exists) continue;

                var existing = await _uow.StudentFees.Query()
                    .FirstOrDefaultAsync(sf => sf.StudentId == student.Id && sf.GroupId == groupId
                                            && sf.Month == month && sf.Year == year);

                if (existing != null)
                {
                    existing.RequiredAmount = feePlan.Amount;
                    if (student.IsFeeExempted && !existing.IsExempted)
                    {
                        existing.IsExempted = true;
                        existing.ExemptionReason = student.FeeExemptionReason ?? "إعفاء دائم";
                    }
                    _uow.StudentFees.Update(existing);
                    await _uow.SaveAsync();
                    continue;
                }

                // 2. Prevent duplicate fee if student has a fee for this month in another group (e.g. transferred)
                var existingOtherGroup = await _uow.StudentFees.Query()
                    .FirstOrDefaultAsync(sf => sf.StudentId == student.Id && sf.GroupId != groupId
                                            && sf.Month == month && sf.Year == year);

                if (existingOtherGroup != null)
                {
                    existingOtherGroup.GroupId = groupId;
                    if (existingOtherGroup.AmountPaid == 0)
                    {
                        existingOtherGroup.RequiredAmount = feePlan.Amount;
                    }
                    else if (feePlan.Amount > existingOtherGroup.RequiredAmount)
                    {
                        existingOtherGroup.RequiredAmount = feePlan.Amount;
                    }

                    if (student.IsFeeExempted && !existingOtherGroup.IsExempted)
                    {
                        existingOtherGroup.IsExempted = true;
                        existingOtherGroup.ExemptionReason = student.FeeExemptionReason ?? "إعفاء دائم";
                    }

                    _uow.StudentFees.Update(existingOtherGroup);
                    await _uow.SaveAsync();
                    continue;
                }

                var sf = new StudentFee
                {
                    StudentId = student.Id,
                    RequiredAmount = feePlan.Amount,
                    GroupId = groupId,
                    Month = month,
                    Year = year,
                    AmountPaid = 0,
                    PaymentDate = null,
                    IsExempted = student.IsFeeExempted,
                    ExemptionReason = student.IsFeeExempted ? (student.FeeExemptionReason ?? "إعفاء دائم") : null
                };

                await _uow.StudentFees.AddAsync(sf);
            }
"@

$normFee = $feeSvcText -replace "`r`n", "`n"
$normOldGen = $oldGen -replace "`r`n", "`n"
$normNewGen = $newGen -replace "`r`n", "`n"

if ($normFee.Contains($normOldGen)) {
    $normFee = $normFee.Replace($normOldGen, $normNewGen)
}

# Update IsActiveInGroup in GetAllAsync
$normFee = $normFee.Replace(
    "IsStudentActive = sf.Student.IsActive",
    "IsStudentActive = sf.Student.IsActive,`r`n                    IsActiveInGroup = sf.Student.StudentGroups.Any(sg => sg.GroupId == sf.GroupId && sg.IsActive)"
)

[IO.File]::WriteAllText($feeSvcPath, ($normFee -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
Write-Host "9. Updated StudentFeeService.cs"

Write-Host "ALL BACKEND FILES UPDATED SUCCESSFULLY!"
