$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = $conn.CreateCommand()

$cmd.CommandText = "SELECT * FROM AcademicYears"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    $row = ""
    for ($idx=0; $idx -lt $reader.FieldCount; $idx++) {
        $row += "$($reader.GetName($idx)) = $($reader[$idx]) | "
    }
    Write-Host $row
}
$reader.Close()
$conn.Close()
