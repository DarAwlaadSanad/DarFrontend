const fs = require('fs');
const svcPath = 'H:/.net projects/DarV2/DarV2/Service/Student/StudentService.cs';
let content = fs.readFileSync(svcPath, 'utf8');

// Replace in GetByIdAsync
const oldByIdPattern = /Groups\s*=\s*student\.StudentGroups\.Select\(g\s*=>\s*new GroupCardDTO\s*\{[\s\S]*?\}\)\.ToList\(\),/;
const newByIdText = `Groups = student.StudentGroups.Where(sg => sg.Group != null).Select(sg => new GroupCardDTO
                {
                    Id = sg.Group.Id,
                    Name = sg.Group.Name,
                    Description = sg.Group.Description,
                    TeacherName = sg.Group.Teacher?.FullName ?? sg.Group.Teacher?.UserName,
                    StudentCount = sg.Group.StudentGroups?.Count(s => s.IsActive) ?? 0,
                    IsActive = sg.IsActive,
                    SeparationReason = sg.SeparationReason
                }).ToList(),`;

console.log('Matches oldByIdPattern?', oldByIdPattern.test(content));
content = content.replace(oldByIdPattern, newByIdText);

// Replace in GetGroupsAsync
const oldGetGroupsPattern = /public async Task<IEnumerable<GroupCardDTO>> GetGroupsAsync\(int studentId\)[\s\S]*?return groups\.Select\(g\s*=>\s*new GroupCardDTO\s*\{[\s\S]*?\}\)\.ToList\(\);\s*\}/;
const newGetGroupsText = `public async Task<IEnumerable<GroupCardDTO>> GetGroupsAsync(int studentId)
        {
            var student = await _uow.Students.GetStudentPage(studentId);
            if (student == null) return Enumerable.Empty<GroupCardDTO>();

            return student.StudentGroups.Where(sg => sg.Group != null).Select(sg => new GroupCardDTO
            {
                Id = sg.Group.Id,
                Name = sg.Group.Name,
                Description = sg.Group.Description,
                TeacherName = sg.Group.Teacher?.FullName ?? sg.Group.Teacher?.UserName,
                StudentCount = sg.Group.StudentGroups?.Count(s => s.IsActive) ?? 0,
                IsActive = sg.IsActive,
                SeparationReason = sg.SeparationReason
            }).ToList();
        }`;

console.log('Matches oldGetGroupsPattern?', oldGetGroupsPattern.test(content));
content = content.replace(oldGetGroupsPattern, newGetGroupsText);

fs.writeFileSync(svcPath, '\uFEFF' + content.replace(/^\uFEFF/, ''), 'utf8');
console.log('Successfully written StudentService.cs with BOM');
