$backendRoot = "H:\.net projects\DarV2\DarV2"
$wsFile = Join-Path $backendRoot "Controllers\WaitingStudentsController.cs"
$wsContent = Get-Content $wsFile -Raw

if ($wsContent -notmatch 'public-stats') {
    $endpoint = @"
        [HttpGet("public-stats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicStats([FromServices] DarV2.Context.DarContext context)
        {
            var studentsCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(context.Students.Where(s => s.IsActive));
            var groupsCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(context.Groups);
            
            var assignedTeachersCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(
                context.Groups
                    .Where(g => !string.IsNullOrEmpty(g.TeacherId))
                    .Select(g => g.TeacherId!)
                    .Distinct()
            );

            if (assignedTeachersCount == 0)
            {
                var teacherRoleId = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    context.Roles.Where(r => r.Name == "مدرس" || r.Name == "Teacher").Select(r => r.Id)
                );
                if (teacherRoleId != null)
                {
                    assignedTeachersCount = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(
                        context.UserRoles.Where(ur => ur.RoleId == teacherRoleId)
                    );
                }
            }

            return Ok(new
            {
                totalStudents = studentsCount,
                totalGroups = groupsCount,
                totalTeachers = assignedTeachersCount
            });
        }
"@
    $wsContent = $wsContent -replace '(\[HttpPost\]\s*\[AllowAnonymous\])', "$endpoint`r`n`r`n        `$1"
    Set-Content $wsFile -Value $wsContent -Encoding utf8
    Write-Host "Added public-stats endpoint to WaitingStudentsController"
}

cd $backendRoot
dotnet build
