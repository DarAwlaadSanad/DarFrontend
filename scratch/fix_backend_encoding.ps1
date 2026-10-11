$utf8WithBom = [System.Text.UTF8Encoding]::new($true)

# 1. Fix StudentController.cs
$studentCtrlPath = "H:\.net projects\DarV2\DarV2\Controllers\StudentController.cs"
$ctrlText = [IO.File]::ReadAllText($studentCtrlPath, [System.Text.Encoding]::UTF8)

# Replace any garbled text in groupStatus and transferGroup
$oldGroupStatus = @"
        [HttpPost("groupStatus")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> ChangeGroupStatus([FromBody] StudentGroupStatusDTO dto)
        {
            var ok = await _studentService.ChangeStudentGroupStatusAsync(dto);
            if (!ok) return BadRequest("ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ø§Ù„Ø¨ Ù ÙŠ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©");
            return Ok(new { message = dto.IsActive ? "ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªÙ†Ø´ÙŠØ· Ø§Ù„Ø·Ø§Ù„Ø¨ Ù ÙŠ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©" : "ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù„Ù…Ù†Ù‚Ø·Ø¹ÙŠÙ† Ø¹Ù† Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©" });
        }

        [HttpPost("transferGroup")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> TransferGroup([FromBody] StudentTransferDTO dto)
        {
            var ok = await _studentService.TransferStudentAsync(dto);
            if (!ok) return BadRequest("ØªØ¹Ø°Ø± Ù†Ù‚Ù„ Ø§Ù„Ø·Ø§Ù„Ø¨ Ø¥Ù„Ù‰ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©");
            return Ok(new { message = "ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø·Ø§Ù„Ø¨ ÙˆÙ…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø¨Ù†Ø¬Ø§Ø­" });
        }
"@

$cleanGroupStatus = @"
        [HttpPost("groupStatus")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> ChangeGroupStatus([FromBody] StudentGroupStatusDTO dto)
        {
            var ok = await _studentService.ChangeStudentGroupStatusAsync(dto);
            if (!ok) return BadRequest("تعذر تحديث حالة الطالب في المجموعة");
            return Ok(new { message = dto.IsActive ? "تمت إعادة تنشيط الطالب في المجموعة بنجاح" : "تم نقل الطالب للمنقطعين عن هذه المجموعة بنجاح" });
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

# Normalize newlines
$normCtrl = $ctrlText -replace "`r`n", "`n"
$normOld = $oldGroupStatus -replace "`r`n", "`n"
$normClean = $cleanGroupStatus -replace "`r`n", "`n"

if ($normCtrl.Contains($normOld)) {
    $normCtrl = $normCtrl.Replace($normOld, $normClean)
} else {
    # In case of variations, regex replace
    $pattern = '(?s)\[HttpPost\("groupStatus"\)\].*?return Ok\(new \{ message = ".*?" \}\);\s*\}'
    $normCtrl = [System.Text.RegularExpressions.Regex]::Replace($normCtrl, $pattern, $normClean)
}

[IO.File]::WriteAllText($studentCtrlPath, ($normCtrl -replace "`n", "`r`n"), $utf8WithBom)
Write-Host "Fixed encoding in StudentController.cs"

# 2. Fix StudentService.cs
$studentSvcPath = "H:\.net projects\DarV2\DarV2\Service\Student\StudentService.cs"
$svcText = [IO.File]::ReadAllText($studentSvcPath, [System.Text.Encoding]::UTF8)
$svcText = $svcText.Replace('$"ØªÙ… Ø§Ù„Ù†Ù‚Ù„ Ø¥Ù„Ù‰ Ø­Ù„Ù‚Ø© {toGroup.Name}"', '$"تم النقل إلى حلقة {toGroup.Name}"')
$svcText = $svcText.Replace('throw new Exception("Ø§Ù„Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");', 'throw new Exception("الطالب غير موجود");')
$svcText = $svcText.Replace('throw new Exception("Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ  ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯");', 'throw new Exception("رقم الهاتف غير موجود");')
$svcText = $svcText.Replace('"Ø§Ù„Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯."', '"الطالب غير موجود."')
$svcText = $svcText.Replace('"Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ù Ø§Ø±ØºØ©."', '"لا يمكن تعيين كلمة مرور فارغة."')

[IO.File]::WriteAllText($studentSvcPath, $svcText, $utf8WithBom)
Write-Host "Fixed encoding in StudentService.cs"
