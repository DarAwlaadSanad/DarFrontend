$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) as TotalCount, COUNT(CASE WHEN Code LIKE 'STD-%' THEN 1 END) as StdCount FROM Students"
    $reader = $cmd.ExecuteReader()
    if ($reader.Read()) {
        Write-Host "Total Students: $($reader['TotalCount']), With STD-: $($reader['StdCount'])"
    }
    $reader.Close()

    $cmd.CommandText = "SELECT TOP 10 Id, Code, FullName FROM Students ORDER BY Id"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "$($reader['Id']) | $($reader['Code']) | $($reader['FullName'])"
    }
    $reader.Close()
} finally {
    $conn.Close()
}
