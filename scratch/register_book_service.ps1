$programPath = "H:\.net projects\DarV2\DarV2\Program.cs"
$content = [System.IO.File]::ReadAllText($programPath, [System.Text.Encoding]::UTF8)

$search = "builder.Services.AddScoped<IChatService, ChatService>();"
$replacement = @"
builder.Services.AddScoped<IChatService, ChatService>();
            // Book service
            builder.Services.AddScoped<DarV2.Service.Book.IBookService, DarV2.Service.Book.BookService>();
"@

if ($content.Contains($search) -and -not $content.Contains("IBookService")) {
    $content = $content.Replace($search, $replacement)
    [System.IO.File]::WriteAllText($programPath, $content, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully registered IBookService in Program.cs"
} else {
    Write-Output "Already registered or pattern not found"
}
