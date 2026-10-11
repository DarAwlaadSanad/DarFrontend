const fs = require('fs');

// 1. Update GroupCardDTO.cs
const dtoPath = 'H:\\.net projects\\DarV2\\DarV2\\DTOs\\Group\\GroupCardDTO.cs';
let dtoContent = fs.readFileSync(dtoPath, 'utf8');

if (!dtoContent.includes('IsActive')) {
  dtoContent = dtoContent.replace(
    'public string? RoomName { get; set; }',
    'public string? RoomName { get; set; }\n        public bool IsActive { get; set; } = true;\n        public string? SeparationReason { get; set; }'
  );
  fs.writeFileSync(dtoPath, '\uFEFF' + dtoContent.replace(/^\uFEFF/, ''), 'utf8');
  console.log('Updated GroupCardDTO.cs');
} else {
  console.log('GroupCardDTO.cs already has IsActive');
}

// 2. Update StudentService.cs
const svcPath = 'H:\\.net projects\\DarV2\\DarV2\\Service\\Student\\StudentService.cs';
let svcContent = fs.readFileSync(svcPath, 'utf8');

// Update GetGroupsAsync
const oldGetGroups = `        public async Task<IEnumerable<GroupCardDTO>> GetGroupsAsync(int studentId)
        {
            var student = await _uow.Students.GetStudentPage(studentId);
            if (student == null) return Enumerable.Empty<GroupCardDTO>();

            var groups = student.StudentGroups.Select(sg => sg.Group).ToList();
            return groups.Select(g => new GroupCardDTO
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                TeacherName = g.Teacher?.FullName,
                StudentCount = g.StudentGroups?.Count ?? 0
            }).ToList();
        }`;

const newGetGroups = `        public async Task<IEnumerable<GroupCardDTO>> GetGroupsAsync(int studentId)
        {
            var student = await _uow.Students.GetStudentPage(studentId);
            if (student == null) return Enumerable.Empty<GroupCardDTO>();

            return student.StudentGroups.Where(sg => sg.Group != null).Select(sg => new GroupCardDTO
            {
                Id = sg.Group.Id,
                Name = sg.Group.Name,
                Description = sg.Group.Description,
                TeacherName = sg.Group.Teacher?.FullName,
                StudentCount = sg.Group.StudentGroups?.Count(s => s.IsActive) ?? 0,
                IsActive = sg.IsActive,
                SeparationReason = sg.SeparationReason
            }).ToList();
        }`;

if (svcContent.includes(oldGetGroups)) {
  svcContent = svcContent.replace(oldGetGroups, newGetGroups);
}

// Update GetByIdAsync Groups mapping
const oldByIdGroups = `                Groups= student.StudentGroups.Select(g => new GroupCardDTO
                {
                    Id = g.Id,
                    Name = g.Group.Name,
                    Description = g.Group.Description,
                    TeacherName = g.Group.Teacher?.UserName,
                    StudentCount = g.Group.StudentGroups?.Count ?? 0
                }).ToList(),`;

const newByIdGroups = `                Groups = student.StudentGroups.Where(sg => sg.Group != null).Select(sg => new GroupCardDTO
                {
                    Id = sg.Group.Id,
                    Name = sg.Group.Name,
                    Description = sg.Group.Description,
                    TeacherName = sg.Group.Teacher?.FullName ?? sg.Group.Teacher?.UserName,
                    StudentCount = sg.Group.StudentGroups?.Count(s => s.IsActive) ?? 0,
                    IsActive = sg.IsActive,
                    SeparationReason = sg.SeparationReason
                }).ToList(),`;

if (svcContent.includes(oldByIdGroups)) {
  svcContent = svcContent.replace(oldByIdGroups, newByIdGroups);
}

fs.writeFileSync(svcPath, '\uFEFF' + svcContent.replace(/^\uFEFF/, ''), 'utf8');
console.log('Updated StudentService.cs with IsActive in GroupCardDTO');
