$backendRoot = "H:\.net projects\DarV2\DarV2"

# 1. Models/WaitingStudent/WaitingStudentStatus.cs
$statusDir = Join-Path $backendRoot "Models\WaitingStudent"
if (!(Test-Path $statusDir)) { New-Item -ItemType Directory -Path $statusDir -Force }

$statusContent = @"
namespace DarV2.Models
{
    public enum WaitingStudentStatus
    {
        Pending = 0,   // قيد الانتظار
        Accepted = 1,  // تم القبول والتسكين
        Rejected = 2   // مرفوض
    }
}
"@
Set-Content -Path (Join-Path $statusDir "WaitingStudentStatus.cs") -Value $statusContent -Encoding utf8

# 2. Models/WaitingStudent/WaitingStudent.cs
$modelContent = @"
using System;

namespace DarV2.Models
{
    public class WaitingStudent
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? SSN { get; set; }
        public Gender Gender { get; set; } = Gender.Male;
        public int? AcademicYearId { get; set; }
        public AcademicYear? AcademicYear { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string? PhoneDescription { get; set; }
        public string? PersonalPhotoUrl { get; set; }
        public string? DocumentUrl { get; set; }
        public string? DocumentBackUrl { get; set; }
        public string? Notes { get; set; }
        public WaitingStudentStatus Status { get; set; } = WaitingStudentStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? AcceptedStudentId { get; set; }
        public Student? AcceptedStudent { get; set; }
    }
}
"@
Set-Content -Path (Join-Path $statusDir "WaitingStudent.cs") -Value $modelContent -Encoding utf8

# 3. Add DbSet to DarContext.cs if not present
$contextFile = Join-Path $backendRoot "Context\DarContext.cs"
$contextText = Get-Content $contextFile -Raw
if ($contextText -notmatch 'DbSet<WaitingStudent>') {
    $contextText = $contextText -replace 'public DbSet<Book> Books \{ get; set; \}', "public DbSet<Book> Books { get; set; }`r`n        public DbSet<WaitingStudent> WaitingStudents { get; set; }"
    Set-Content -Path $contextFile -Value $contextText -Encoding utf8
    Write-Host "Added WaitingStudents DbSet to DarContext.cs"
}

# 4. DTOs/WaitingStudent/WaitingStudentDTOs.cs
$dtoDir = Join-Path $backendRoot "DTOs\WaitingStudent"
if (!(Test-Path $dtoDir)) { New-Item -ItemType Directory -Path $dtoDir -Force }

$dtoContent = @"
using System;
using Microsoft.AspNetCore.Http;
using DarV2.Models;

namespace DarV2.DTOs
{
    public class WaitingStudentViewDTO
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? SSN { get; set; }
        public Gender Gender { get; set; }
        public string GenderLabel => Gender == Gender.Male ? "بنين" : "بنات";
        public int? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string? PhoneDescription { get; set; }
        public string? PersonalPhotoUrl { get; set; }
        public string? DocumentUrl { get; set; }
        public string? DocumentBackUrl { get; set; }
        public string? Notes { get; set; }
        public WaitingStudentStatus Status { get; set; }
        public string StatusLabel => Status switch
        {
            WaitingStudentStatus.Pending => "قيد الانتظار",
            WaitingStudentStatus.Accepted => "تم القبول",
            WaitingStudentStatus.Rejected => "مرفوض",
            _ => "غير محدد"
        };
        public DateTime CreatedAt { get; set; }
        public int? AcceptedStudentId { get; set; }
        public string? AcceptedStudentCode { get; set; }
    }

    public class WaitingStudentAddDTO
    {
        public string FullName { get; set; } = string.Empty;
        public string? SSN { get; set; }
        public Gender Gender { get; set; } = Gender.Male;
        public int? AcademicYearId { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string? PhoneDescription { get; set; } = "ولي الأمر";
        public string? Notes { get; set; }
        public IFormFile? PersonalPhotoFile { get; set; }
        public IFormFile? DocumentFile { get; set; }
        public IFormFile? DocumentBackFile { get; set; }
    }

    public class WaitingStudentStatusUpdateDTO
    {
        public WaitingStudentStatus Status { get; set; }
        public string? Notes { get; set; }
    }

    public class AcceptWaitingStudentDTO
    {
        public int? GroupId { get; set; }
        public string? Notes { get; set; }
    }
}
"@
Set-Content -Path (Join-Path $dtoDir "WaitingStudentDTOs.cs") -Value $dtoContent -Encoding utf8

# 5. Service/WaitingStudent/IWaitingStudentService.cs
$serviceDir = Join-Path $backendRoot "Service\WaitingStudent"
if (!(Test-Path $serviceDir)) { New-Item -ItemType Directory -Path $serviceDir -Force }

$iServiceContent = @"
using System.Collections.Generic;
using System.Threading.Tasks;
using DarV2.DTOs;
using DarV2.Models;

namespace DarV2.Service
{
    public interface IWaitingStudentService
    {
        Task<List<WaitingStudentViewDTO>> GetAllAsync(WaitingStudentStatus? status = null, string? search = null, int? academicYearId = null);
        Task<WaitingStudentViewDTO?> GetByIdAsync(int id);
        Task<WaitingStudentViewDTO> CreateAsync(WaitingStudentAddDTO dto);
        Task<bool> UpdateStatusAsync(int id, WaitingStudentStatus status, string? notes = null);
        Task<StudentDetailsDTO> AcceptAndEnrollAsync(int id, int? groupId = null);
        Task<bool> DeleteAsync(int id);
    }
}
"@
Set-Content -Path (Join-Path $serviceDir "IWaitingStudentService.cs") -Value $iServiceContent -Encoding utf8

# 6. Service/WaitingStudent/WaitingStudentService.cs
$serviceContent = @"
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CloudinaryDotNet;
using DarV2.Context;
using DarV2.DTOs;
using DarV2.Models;

namespace DarV2.Service
{
    public class WaitingStudentService : IWaitingStudentService
    {
        private readonly DarContext _context;
        private readonly Cloudinary _cloudinary;
        private readonly IStudentService _studentService;

        public WaitingStudentService(DarContext context, Cloudinary cloudinary, IStudentService studentService)
        {
            _context = context;
            _cloudinary = cloudinary;
            _studentService = studentService;
        }

        public async Task<List<WaitingStudentViewDTO>> GetAllAsync(WaitingStudentStatus? status = null, string? search = null, int? academicYearId = null)
        {
            var query = _context.WaitingStudents
                .AsNoTracking()
                .Include(w => w.AcademicYear)
                .Include(w => w.AcceptedStudent)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(w => w.Status == status.Value);
            }

            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                query = query.Where(w => w.AcademicYearId == academicYearId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(w => w.FullName.ToLower().Contains(term) ||
                                         (w.SSN != null && w.SSN.Contains(term)) ||
                                         w.PhoneNumber.Contains(term));
            }

            var items = await query.OrderByDescending(w => w.CreatedAt).ToListAsync();

            return items.Select(w => new WaitingStudentViewDTO
            {
                Id = w.Id,
                FullName = w.FullName,
                SSN = w.SSN,
                Gender = w.Gender,
                AcademicYearId = w.AcademicYearId,
                AcademicYearName = w.AcademicYear?.Name,
                PhoneNumber = w.PhoneNumber,
                PhoneDescription = w.PhoneDescription,
                PersonalPhotoUrl = w.PersonalPhotoUrl,
                DocumentUrl = w.DocumentUrl,
                DocumentBackUrl = w.DocumentBackUrl,
                Notes = w.Notes,
                Status = w.Status,
                CreatedAt = w.CreatedAt,
                AcceptedStudentId = w.AcceptedStudentId,
                AcceptedStudentCode = w.AcceptedStudent?.Code
            }).ToList();
        }

        public async Task<WaitingStudentViewDTO?> GetByIdAsync(int id)
        {
            var w = await _context.WaitingStudents
                .AsNoTracking()
                .Include(x => x.AcademicYear)
                .Include(x => x.AcceptedStudent)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (w == null) return null;

            return new WaitingStudentViewDTO
            {
                Id = w.Id,
                FullName = w.FullName,
                SSN = w.SSN,
                Gender = w.Gender,
                AcademicYearId = w.AcademicYearId,
                AcademicYearName = w.AcademicYear?.Name,
                PhoneNumber = w.PhoneNumber,
                PhoneDescription = w.PhoneDescription,
                PersonalPhotoUrl = w.PersonalPhotoUrl,
                DocumentUrl = w.DocumentUrl,
                DocumentBackUrl = w.DocumentBackUrl,
                Notes = w.Notes,
                Status = w.Status,
                CreatedAt = w.CreatedAt,
                AcceptedStudentId = w.AcceptedStudentId,
                AcceptedStudentCode = w.AcceptedStudent?.Code
            };
        }

        public async Task<WaitingStudentViewDTO> CreateAsync(WaitingStudentAddDTO dto)
        {
            string? photoUrl = null;
            string? docUrl = null;
            string? docBackUrl = null;

            if (dto.PersonalPhotoFile != null && dto.PersonalPhotoFile.Length > 0)
            {
                var upload = await FileUpload.UploadAsync(dto.PersonalPhotoFile, _cloudinary);
                photoUrl = upload.Url?.ToString();
            }

            if (dto.DocumentFile != null && dto.DocumentFile.Length > 0)
            {
                var upload = await FileUpload.UploadAsync(dto.DocumentFile, _cloudinary);
                docUrl = upload.Url?.ToString();
            }

            if (dto.DocumentBackFile != null && dto.DocumentBackFile.Length > 0)
            {
                var upload = await FileUpload.UploadAsync(dto.DocumentBackFile, _cloudinary);
                docBackUrl = upload.Url?.ToString();
            }

            var entity = new WaitingStudent
            {
                FullName = dto.FullName.Trim(),
                SSN = string.IsNullOrWhiteSpace(dto.SSN) ? null : dto.SSN.Trim(),
                Gender = dto.Gender,
                AcademicYearId = dto.AcademicYearId > 0 ? dto.AcademicYearId : null,
                PhoneNumber = dto.PhoneNumber.Trim(),
                PhoneDescription = string.IsNullOrWhiteSpace(dto.PhoneDescription) ? "ولي الأمر" : dto.PhoneDescription.Trim(),
                PersonalPhotoUrl = photoUrl,
                DocumentUrl = docUrl,
                DocumentBackUrl = docBackUrl,
                Notes = dto.Notes,
                Status = WaitingStudentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await _context.WaitingStudents.AddAsync(entity);
            await _context.SaveChangesAsync();

            string? yearName = null;
            if (entity.AcademicYearId.HasValue)
            {
                yearName = await _context.AcademicYears
                    .Where(a => a.Id == entity.AcademicYearId.Value)
                    .Select(a => a.Name)
                    .FirstOrDefaultAsync();
            }

            return new WaitingStudentViewDTO
            {
                Id = entity.Id,
                FullName = entity.FullName,
                SSN = entity.SSN,
                Gender = entity.Gender,
                AcademicYearId = entity.AcademicYearId,
                AcademicYearName = yearName,
                PhoneNumber = entity.PhoneNumber,
                PhoneDescription = entity.PhoneDescription,
                PersonalPhotoUrl = entity.PersonalPhotoUrl,
                DocumentUrl = entity.DocumentUrl,
                DocumentBackUrl = entity.DocumentBackUrl,
                Notes = entity.Notes,
                Status = entity.Status,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<bool> UpdateStatusAsync(int id, WaitingStudentStatus status, string? notes = null)
        {
            var entity = await _context.WaitingStudents.FindAsync(id);
            if (entity == null) return false;

            entity.Status = status;
            if (!string.IsNullOrWhiteSpace(notes))
            {
                entity.Notes = string.IsNullOrWhiteSpace(entity.Notes) ? notes : $"{entity.Notes}\n{notes}";
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<StudentDetailsDTO> AcceptAndEnrollAsync(int id, int? groupId = null)
        {
            var entity = await _context.WaitingStudents.FindAsync(id);
            if (entity == null) throw new Exception("طلب التقديم غير موجود");
            if (entity.Status == WaitingStudentStatus.Accepted && entity.AcceptedStudentId.HasValue)
            {
                throw new Exception("تم قبول هذا الطالب وتسجيله مسبقاً في الدار");
            }

            var groupIds = new List<int>();
            if (groupId.HasValue && groupId.Value > 0)
            {
                groupIds.Add(groupId.Value);
            }

            var studentAddDto = new StudentAddDTO
            {
                FullName = entity.FullName,
                SSN = entity.SSN ?? string.Empty,
                Gender = entity.Gender,
                AcademicYearId = entity.AcademicYearId ?? 1,
                Notes = entity.Notes,
                GroupIds = groupIds,
                PhoneNumbers = new List<string> { entity.PhoneNumber },
                PhoneDescriptions = new List<string> { entity.PhoneDescription ?? "ولي الأمر" },
                ImageFiles = new List<IFormFile>()
            };

            var createdStudent = await _studentService.CreateAsync(studentAddDto);

            // Copy application images to Student Images table
            var imagesToAdd = new List<string>();
            if (!string.IsNullOrWhiteSpace(entity.PersonalPhotoUrl)) imagesToAdd.Add(entity.PersonalPhotoUrl);
            if (!string.IsNullOrWhiteSpace(entity.DocumentUrl)) imagesToAdd.Add(entity.DocumentUrl);
            if (!string.IsNullOrWhiteSpace(entity.DocumentBackUrl)) imagesToAdd.Add(entity.DocumentBackUrl);

            foreach (var imgUrl in imagesToAdd)
            {
                _context.Images.Add(new Image { Url = imgUrl, StudentId = createdStudent.Id });
            }

            entity.Status = WaitingStudentStatus.Accepted;
            entity.AcceptedStudentId = createdStudent.Id;
            await _context.SaveChangesAsync();

            return createdStudent;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.WaitingStudents.FindAsync(id);
            if (entity == null) return false;

            _context.WaitingStudents.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
"@
Set-Content -Path (Join-Path $serviceDir "WaitingStudentService.cs") -Value $serviceContent -Encoding utf8

# 7. Controllers/WaitingStudentsController.cs
$controllerDir = Join-Path $backendRoot "Controllers"
$controllerContent = @"
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DarV2.Service;
using DarV2.DTOs;
using DarV2.Models;

namespace DarV2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WaitingStudentsController : ControllerBase
    {
        private readonly IWaitingStudentService _service;

        public WaitingStudentsController(IWaitingStudentService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll([FromQuery] WaitingStudentStatus? status, [FromQuery] string? search, [FromQuery] int? academicYearId)
        {
            var result = await _service.GetAllAsync(status, search, academicYearId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound(new { message = "طلب التقديم غير موجود" });
            return Ok(item);
        }

        [HttpPost]
        [AllowAnonymous]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create([FromForm] WaitingStudentAddDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                return BadRequest(new { message = "الاسم ورقم الهاتف مطلوبان" });
            }

            var created = await _service.CreateAsync(dto);
            return Ok(created);
        }

        [HttpPut("{id}/status")]
        [Authorize]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] WaitingStudentStatusUpdateDTO dto)
        {
            var success = await _service.UpdateStatusAsync(id, dto.Status, dto.Notes);
            if (!success) return NotFound(new { message = "طلب التقديم غير موجود" });
            return Ok(new { message = "تم تحديث حالة الطلب بنجاح" });
        }

        [HttpPost("{id}/accept")]
        [Authorize]
        public async Task<IActionResult> Accept(int id, [FromBody] AcceptWaitingStudentDTO? dto)
        {
            try
            {
                var student = await _service.AcceptAndEnrollAsync(id, dto?.GroupId);
                return Ok(new { message = "تم قبول الطالب وتسجيله بنجاح", student });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound(new { message = "طلب التقديم غير موجود" });
            return Ok(new { message = "تم حذف الطلب بنجاح" });
        }
    }
}
"@
Set-Content -Path (Join-Path $controllerDir "WaitingStudentsController.cs") -Value $controllerContent -Encoding utf8

# 8. Add service registration to Program.cs
$programFile = Join-Path $backendRoot "Program.cs"
$programText = Get-Content $programFile -Raw
if ($programText -notmatch 'IWaitingStudentService') {
    $programText = $programText -replace 'builder\.Services\.AddScoped<IStudentService, StudentService\(\)\>;', "builder.Services.AddScoped<IStudentService, StudentService>();`r`n            builder.Services.AddScoped<IWaitingStudentService, WaitingStudentService>();"
    if ($programText -notmatch 'IWaitingStudentService') {
        # Fallback replace
        $programText = $programText -replace 'builder\.Services\.AddScoped<IStudentService, StudentService\>;', "builder.Services.AddScoped<IStudentService, StudentService>();`r`n            builder.Services.AddScoped<IWaitingStudentService, WaitingStudentService>();"
    }
    Set-Content -Path $programFile -Value $programText -Encoding utf8
    Write-Host "Registered IWaitingStudentService in Program.cs"
}

Write-Host "All backend files for WaitingStudents generated successfully!"
