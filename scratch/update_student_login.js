const fs = require('fs');

// 1. Update StudentLoginResponse.cs
const respPath = 'H:/.net projects/DarV2/DarV2/DTOs/Student/StudentLoginResponse.cs';
let respContent = fs.readFileSync(respPath, 'utf8');
if (!respContent.includes('IsActive')) {
  respContent = respContent.replace(
    'public List<string> Roles { get; set; } = new List<string> { "Student" };',
    'public List<string> Roles { get; set; } = new List<string> { "Student" };\n        public bool IsActive { get; set; } = true;'
  );
  fs.writeFileSync(respPath, '\uFEFF' + respContent.replace(/^\uFEFF/, ''), 'utf8');
  console.log('Updated StudentLoginResponse.cs with IsActive');
} else {
  console.log('StudentLoginResponse.cs already has IsActive');
}

// 2. Update StudentService.cs LoginAsync
const svcPath = 'H:/.net projects/DarV2/DarV2/Service/Student/StudentService.cs';
let svcContent = fs.readFileSync(svcPath, 'utf8');

// Replace the FirstOrDefaultAsync check that restricted to s.IsActive
const oldStudentLookup = /var paddedCode = int\.TryParse\(Code, out var cNum\) \? "\{cNum:D4\}" : Code;\s*var student = await _uow\.Students\s*\.FirstOrDefaultAsync\(s => \(s\.Code == Code \|\| s\.Code == paddedCode\)\s*&&\s*s\.IsActive\);/;

const newStudentLookup = `var paddedCode = int.TryParse(Code, out var cNum) ? $"{cNum:D4}" : Code;

            var student = await _uow.Students
                                    .FirstOrDefaultAsync(s => s.Code == Code || s.Code == paddedCode);`;

if (oldStudentLookup.test(svcContent)) {
  svcContent = svcContent.replace(oldStudentLookup, newStudentLookup);
  console.log('Replaced student lookup in LoginAsync');
} else {
  console.log('Warning: oldStudentLookup regex did not match');
}

// Replace UnauthorizedAccessException message if English
svcContent = svcContent.replace(
  'throw new UnauthorizedAccessException("Invalid code or password");',
  'throw new UnauthorizedAccessException("كود الطالب أو كلمة المرور غير صحيحة");'
);

// Map IsActive in return new StudentLoginResponse
const oldReturnPattern = /return new StudentLoginResponse\s*\{[\s\S]*?Role = "Student",\s*Roles = new List<string> \{ "Student" \}\s*\};/;
const newReturnText = `return new StudentLoginResponse
            {
                StudentId = student.Id,
                Token = token,
                RefreshToken = refreshToken,
                FullName = student.FullName,
                Code = student.Code,
                Role = "Student",
                Roles = new List<string> { "Student" },
                IsActive = student.IsActive
            };`;

if (oldReturnPattern.test(svcContent)) {
  svcContent = svcContent.replace(oldReturnPattern, newReturnText);
  console.log('Mapped IsActive in StudentLoginResponse');
} else {
  console.log('Warning: oldReturnPattern regex did not match');
}

// Update GenerateJwtToken to include isActive claim
if (!svcContent.includes('new Claim("isActive", student.IsActive.ToString().ToLower())')) {
  svcContent = svcContent.replace(
    'new Claim(ClaimTypes.Name, student.FullName),',
    'new Claim(ClaimTypes.Name, student.FullName),\n            new Claim("isActive", student.IsActive.ToString().ToLower()),'
  );
  console.log('Added isActive claim to GenerateJwtToken');
}

fs.writeFileSync(svcPath, '\uFEFF' + svcContent.replace(/^\uFEFF/, ''), 'utf8');
console.log('Successfully updated StudentService.cs with BOM');
