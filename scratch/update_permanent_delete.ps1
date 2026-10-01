# 1. Update IStudentService.cs
$iStudentServicePath = "H:\.net projects\DarV2\DarV2\Service\Student\IStudentService.cs"
$iText = [IO.File]::ReadAllText($iStudentServicePath)
if (-not $iText.Contains("PermanentDeleteAsync")) {
    $iText = $iText.Replace("Task<bool> RestoreAsync(int id);", "Task<bool> RestoreAsync(int id);`r`n        Task<bool> PermanentDeleteAsync(int id);")
    [IO.File]::WriteAllText($iStudentServicePath, $iText, [System.Text.Encoding]::UTF8)
    Write-Host "Updated IStudentService.cs"
} else {
    Write-Host "IStudentService.cs already has PermanentDeleteAsync"
}

# 2. Update StudentService.cs
$studentServicePath = "H:\.net projects\DarV2\DarV2\Service\Student\StudentService.cs"
$svcText = [IO.File]::ReadAllText($studentServicePath)
if (-not $svcText.Contains("PermanentDeleteAsync")) {
    $restoreMethod = @"
        public async Task<bool> RestoreAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            student.IsActive = true;
            await _uow.SaveAsync();
            return true;
        }
"@

    $permanentDeleteCode = @"
        public async Task<bool> RestoreAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            student.IsActive = true;
            await _uow.SaveAsync();
            return true;
        }

        public async Task<bool> PermanentDeleteAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            var studentGroups = await _uow.StudentGroups.FindAsync(sg => sg.StudentId == id);
            foreach (var sg in studentGroups) _uow.StudentGroups.Remove(sg);

            var attendances = await _uow.Attendances.FindAsync(a => a.StudentId == id);
            foreach (var a in attendances) _uow.Attendances.Remove(a);

            var evaluations = await _uow.Evaluations.FindAsync(e => e.StudentId == id);
            foreach (var e in evaluations) _uow.Evaluations.Remove(e);

            var memRecords = await _uow.MemorizationRecords.FindAsync(m => m.StudentId == id);
            foreach (var m in memRecords) _uow.MemorizationRecords.Remove(m);

            var fees = await _uow.StudentFees.FindAsync(f => f.StudentId == id);
            foreach (var f in fees) _uow.StudentFees.Remove(f);

            var phones = await _uow.Phones.FindAsync(p => p.StudentId == id);
            foreach (var p in phones) _uow.Phones.Remove(p);

            var images = await _uow.Images.FindAsync(i => i.StudentId == id);
            foreach (var img in images) _uow.Images.Remove(img);

            var warnings = await _uow.StudentWarnings.FindAsync(w => w.StudentId == id);
            foreach (var w in warnings) _uow.StudentWarnings.Remove(w);

            var examResults = await _uow.ExamResults.FindAsync(er => er.StudentId == id);
            foreach (var er in examResults) _uow.ExamResults.Remove(er);

            var compResults = await _uow.CompetitionResults.FindAsync(cr => cr.StudentId == id);
            foreach (var cr in compResults) _uow.CompetitionResults.Remove(cr);

            _uow.Students.Remove(student);
            await _uow.SaveAsync();
            return true;
        }
"@

    $normSvc = $svcText -replace "`r`n", "`n"
    $normRestore = $restoreMethod -replace "`r`n", "`n"
    $normPerm = $permanentDeleteCode -replace "`r`n", "`n"

    if ($normSvc.Contains($normRestore)) {
        $normSvc = $normSvc.Replace($normRestore, $normPerm)
        $finalSvc = $normSvc -replace "`n", "`r`n"
        [IO.File]::WriteAllText($studentServicePath, $finalSvc, [System.Text.Encoding]::UTF8)
        Write-Host "Updated StudentService.cs with PermanentDeleteAsync"
    } else {
        Write-Host "Error: RestoreAsync pattern not found in StudentService.cs"
    }
} else {
    Write-Host "StudentService.cs already has PermanentDeleteAsync"
}

# 3. Update StudentController.cs
$controllerPath = "H:\.net projects\DarV2\DarV2\Controllers\StudentController.cs"
$ctrlText = [IO.File]::ReadAllText($controllerPath)
if (-not $ctrlText.Contains("PermanentDelete")) {
    $normCtrl = $ctrlText -replace "`r`n", "`n"
    $ctrlRegex = '(?s)(\[HttpPost\("\{id\}/restore"\)\].*?return Ok\(.*?\);\s*\})'
    if ($normCtrl -match $ctrlRegex) {
        $matchedBlock = $Matches[1]
        $endpointToAdd = @'

        [HttpDelete("{id}/permanent")]
        [Authorize(Policy = Permissions.DeleteStudents)]
        public async Task<IActionResult> PermanentDelete(int id)
        {
            var ok = await _studentService.PermanentDeleteAsync(id);
            if (!ok) return NotFound();
            return Ok(new { message = "تم حذف الطالب نهائياً من قاعدة البيانات" });
        }
'@
        $replacementBlock = $matchedBlock + ($endpointToAdd -replace "`r`n", "`n")
        $normCtrl = $normCtrl.Replace($matchedBlock, $replacementBlock)
        $finalCtrl = $normCtrl -replace "`n", "`r`n"
        [IO.File]::WriteAllText($controllerPath, $finalCtrl, [System.Text.Encoding]::UTF8)
        Write-Host "Updated StudentController.cs with PermanentDelete endpoint"
    } else {
        Write-Host "Error: Could not match restore endpoint in StudentController.cs"
    }
} else {
    Write-Host "StudentController.cs already has PermanentDelete"
}
