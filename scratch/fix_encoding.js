const fs = require('fs');

// Fix StudentController.cs
const studentCtrlPath = 'H:\\.net projects\\DarV2\\DarV2\\Controllers\\StudentController.cs';
let ctrlContent = fs.readFileSync(studentCtrlPath, 'utf8');

// Replace corrupted Arabic in groupStatus and transferGroup
ctrlContent = ctrlContent.replace(
  /\[HttpPost\("groupStatus"\)\][\s\S]*?return Ok\(new \{ message = .*? \}\);\s*\}/,
  `[HttpPost("groupStatus")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> ChangeGroupStatus([FromBody] StudentGroupStatusDTO dto)
        {
            var ok = await _studentService.ChangeStudentGroupStatusAsync(dto);
            if (!ok) return BadRequest("تعذر تحديث حالة الطالب في المجموعة");
            return Ok(new { message = dto.IsActive ? "تمت إعادة تنشيط الطالب في المجموعة بنجاح" : "تم نقل الطالب للمنقطعين عن هذه المجموعة بنجاح" });
        }`
);

ctrlContent = ctrlContent.replace(
  /\[HttpPost\("transferGroup"\)\][\s\S]*?return Ok\(new \{ message = .*? \}\);\s*\}/,
  `[HttpPost("transferGroup")]
        [Authorize(Policy = Permissions.ManageStudents)]
        public async Task<IActionResult> TransferGroup([FromBody] StudentTransferDTO dto)
        {
            var ok = await _studentService.TransferStudentAsync(dto);
            if (!ok) return BadRequest("تعذر نقل الطالب إلى المجموعة المحددة");
            return Ok(new { message = "تم نقل الطالب ومعالجة السجلات بنجاح" });
        }`
);

// Write with UTF-8 BOM (\uFEFF)
fs.writeFileSync(studentCtrlPath, '\uFEFF' + ctrlContent.replace(/^\uFEFF/, ''), 'utf8');
console.log('Fixed StudentController.cs with UTF-8 BOM');

// Fix StudentService.cs
const studentSvcPath = 'H:\\.net projects\\DarV2\\DarV2\\Service\\Student\\StudentService.cs';
let svcContent = fs.readFileSync(studentSvcPath, 'utf8');

svcContent = svcContent.replace(/\$"ØªÙ… Ø§Ù„Ù†Ù‚Ù„ Ø¥Ù„Ù‰ Ø­Ù„Ù‚Ø© \{toGroup\.Name\}"/g, '$"تم النقل إلى حلقة {toGroup.Name}"');
svcContent = svcContent.replace(/Ø§Ù„Ø·Ø§Ù„Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯/g, 'الطالب غير موجود');
svcContent = svcContent.replace(/Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ\s+ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯/g, 'رقم الهاتف غير موجود');

fs.writeFileSync(studentSvcPath, '\uFEFF' + svcContent.replace(/^\uFEFF/, ''), 'utf8');
console.log('Fixed StudentService.cs with UTF-8 BOM');
