$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

$sql = @"
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WaitingStudents')
BEGIN
    CREATE TABLE [dbo].[WaitingStudents] (
        [Id] INT IDENTITY(1,1) NOT NULL,
        [FullName] NVARCHAR(200) NOT NULL,
        [SSN] NVARCHAR(20) NULL,
        [Gender] INT NOT NULL DEFAULT 1,
        [AcademicYearId] INT NULL,
        [PhoneNumber] NVARCHAR(50) NOT NULL,
        [PhoneDescription] NVARCHAR(100) NULL,
        [PersonalPhotoUrl] NVARCHAR(500) NULL,
        [DocumentUrl] NVARCHAR(500) NULL,
        [DocumentBackUrl] NVARCHAR(500) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [AcceptedStudentId] INT NULL,
        CONSTRAINT [PK_WaitingStudents] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_WaitingStudents_AcademicYears_AcademicYearId] FOREIGN KEY ([AcademicYearId]) REFERENCES [dbo].[AcademicYears] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_WaitingStudents_Students_AcceptedStudentId] FOREIGN KEY ([AcceptedStudentId]) REFERENCES [dbo].[Students] ([Id]) ON DELETE SET NULL
    );
    PRINT 'Table WaitingStudents created successfully.';
END
ELSE
BEGIN
    PRINT 'Table WaitingStudents already exists.';
END
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$cmd.ExecuteNonQuery()
$conn.Close()
Write-Host "Done executing SQL."
