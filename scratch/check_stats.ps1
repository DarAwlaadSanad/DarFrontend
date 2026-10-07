$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()

$cmd.CommandText = "SELECT COUNT(*) FROM Students WHERE IsActive = 1"
$activeStudents = $cmd.ExecuteScalar()

$cmd.CommandText = "SELECT COUNT(*) FROM Groups"
$groups = $cmd.ExecuteScalar()

$cmd.CommandText = "SELECT COUNT(DISTINCT TeacherId) FROM Groups WHERE TeacherId IS NOT NULL AND TeacherId != ''"
$assignedTeachers = $cmd.ExecuteScalar()

$cmd.CommandText = "SELECT COUNT(*) FROM AspNetUsers"
$totalUsers = $cmd.ExecuteScalar()

$cmd.CommandText = "SELECT r.Name, COUNT(*) FROM AspNetUserRoles ur JOIN AspNetRoles r ON ur.RoleId = r.Id GROUP BY r.Name"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host "Role: $($reader[0]) -> $($reader[1])"
}
$reader.Close()

$conn.Close()
Write-Host "ActiveStudents: $activeStudents, Groups: $groups, AssignedTeachers: $assignedTeachers, TotalUsers: $totalUsers"
