$connStr = "Server=db50537.public.databaseasp.net; Database=db50537; User Id=db50537; Password=w?2YBs+68%Lq; Encrypt=True; TrustServerCertificate=True; MultipleActiveResultSets=True;"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

$sql = @"
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentGroups' AND COLUMN_NAME = 'IsActive')
BEGIN
    ALTER TABLE StudentGroups ADD IsActive bit NOT NULL CONSTRAINT DF_StudentGroups_IsActive DEFAULT 1;
    PRINT 'Added IsActive';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentGroups' AND COLUMN_NAME = 'JoinedDate')
BEGIN
    ALTER TABLE StudentGroups ADD JoinedDate datetime2 NOT NULL CONSTRAINT DF_StudentGroups_JoinedDate DEFAULT GETUTCDATE();
    PRINT 'Added JoinedDate';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentGroups' AND COLUMN_NAME = 'LeftDate')
BEGIN
    ALTER TABLE StudentGroups ADD LeftDate datetime2 NULL;
    PRINT 'Added LeftDate';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'StudentGroups' AND COLUMN_NAME = 'SeparationReason')
BEGIN
    ALTER TABLE StudentGroups ADD SeparationReason nvarchar(max) NULL;
    PRINT 'Added SeparationReason';
END
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$cmd.ExecuteNonQuery()
$conn.Close()
Write-Host "Database migration applied successfully!"
