$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 1 ProductVersion FROM [__EFMigrationsHistory] ORDER BY MigrationId DESC"
$version = $cmd.ExecuteScalar()
Write-Host "ProductVersion: $version"

$cmd2 = $conn.CreateCommand()
$cmd2.CommandText = "IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE MigrationId = '20261011094527_AddStudentGroupStatusFields') BEGIN INSERT INTO [__EFMigrationsHistory] (MigrationId, ProductVersion) VALUES ('20261011094527_AddStudentGroupStatusFields', '$version'); PRINT 'Inserted migration'; END"
$cmd2.ExecuteNonQuery()
$conn.Close()
Write-Host "Migration history updated successfully!"
