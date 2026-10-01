# 1. Update IStudentService.cs
$iStudentServicePath = "H:\.net projects\DarV2\DarV2\Service\Student\IStudentService.cs"
$iText = [IO.File]::ReadAllText($iStudentServicePath) -replace "`r`n", "`n"
$oldIDelete = "Task<bool> DeleteAsync(int id);"
$newIDelete = "Task<bool> DeleteAsync(int id);`n        Task<bool> RestoreAsync(int id);"
if ($iText.Contains($oldIDelete)) {
    $iText = $iText.Replace($oldIDelete, $newIDelete)
    [IO.File]::WriteAllText($iStudentServicePath, ($iText -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
    Write-Host "Updated IStudentService.cs"
} else {
    Write-Host "Warning: oldIDelete not found in IStudentService.cs"
}

# 2. Update StudentService.cs
$studentServicePath = "H:\.net projects\DarV2\DarV2\Service\Student\StudentService.cs"
$sText = [IO.File]::ReadAllText($studentServicePath) -replace "`r`n", "`n"
$oldDeleteImpl = @"
        public async Task<bool> DeleteAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            _uow.Students.Remove(student);
            await _uow.SaveAsync();
            return true;
        }
"@ -replace "`r`n", "`n"

$newDeleteImpl = @"
        public async Task<bool> DeleteAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            student.IsActive = false;
            await _uow.SaveAsync();
            return true;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var student = await _uow.Students.GetByIdAsync(id);
            if (student == null) return false;

            student.IsActive = true;
            await _uow.SaveAsync();
            return true;
        }
"@ -replace "`r`n", "`n"

if ($sText.Contains($oldDeleteImpl)) {
    $sText = $sText.Replace($oldDeleteImpl, $newDeleteImpl)
    [IO.File]::WriteAllText($studentServicePath, ($sText -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentService.cs"
} else {
    Write-Host "Warning: oldDeleteImpl not found in StudentService.cs"
}

# 3. Update StudentController.cs
$controllerPath = "H:\.net projects\DarV2\DarV2\Controllers\StudentController.cs"
$cText = [IO.File]::ReadAllText($controllerPath) -replace "`r`n", "`n"
$oldControllerDelete = @"
        [HttpDelete("{id}")]
        [Authorize(Policy = Permissions.DeleteStudents)]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _studentService.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }
"@ -replace "`r`n", "`n"

$newControllerDelete = @"
        [HttpDelete("{id}")]
        [Authorize(Policy = Permissions.DeleteStudents)]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _studentService.DeleteAsync(id);
            if (!ok) return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/restore")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> Restore(int id)
        {
            var ok = await _studentService.RestoreAsync(id);
            if (!ok) return NotFound();
            return Ok(new { message = "تم استعادة وتنشيط الطالب بنجاح" });
        }
"@ -replace "`r`n", "`n"

if ($cText.Contains($oldControllerDelete)) {
    $cText = $cText.Replace($oldControllerDelete, $newControllerDelete)
    [IO.File]::WriteAllText($controllerPath, ($cText -replace "`n", "`r`n"), [System.Text.Encoding]::UTF8)
    Write-Host "Updated StudentController.cs"
} else {
    Write-Host "Warning: oldControllerDelete not found in StudentController.cs"
}
