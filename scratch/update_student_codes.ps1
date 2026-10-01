$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
try {
    $conn.Open()
    Write-Host "Database connected successfully."

    # Update all student codes that have 'STD-' to 4-digit numeric format
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
        UPDATE Students
        SET Code = RIGHT('0000' + LTRIM(RTRIM(REPLACE(Code, 'STD-', ''))), 4)
        WHERE Code LIKE 'STD-%' OR (ISNUMERIC(Code) = 1 AND LEN(Code) < 4);
"@
    $rowsAffected = $cmd.ExecuteNonQuery()
    Write-Host "Updated $rowsAffected student records in database."

    # Verify updated codes
    $cmd.CommandText = "SELECT COUNT(*) as TotalCount, COUNT(CASE WHEN Code LIKE 'STD-%' THEN 1 END) as StdCount FROM Students"
    $reader = $cmd.ExecuteReader()
    if ($reader.Read()) {
        Write-Host "Total Students: $($reader['TotalCount']), Still with STD-: $($reader['StdCount'])"
    }
    $reader.Close()

    # Sample top 10 and bottom 10
    Write-Host "`nSample First 5 Students:"
    $cmd.CommandText = "SELECT TOP 5 Id, Code, FullName FROM Students ORDER BY Id ASC"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "$($reader['Id']) | Code: $($reader['Code']) | $($reader['FullName'])"
    }
    $reader.Close()

    Write-Host "`nSample Last 5 Students:"
    $cmd.CommandText = "SELECT TOP 5 Id, Code, FullName FROM Students ORDER BY Id DESC"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "$($reader['Id']) | Code: $($reader['Code']) | $($reader['FullName'])"
    }
    $reader.Close()

} finally {
    $conn.Close()
}
