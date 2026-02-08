Param(
    [string]$Server = "localhost",
    [string]$SaUser = "sa",
    [string]$SaPassword = "SqlServer@123",
    [string]$DbName = "SprintFlow",
    [string]$DbUser = "Molina",
    [string]$DbPassword = "SqlServer@123"
)

$ErrorActionPreference = "Stop"

$sqlCreateDb = "IF DB_ID(N'$DbName') IS NULL CREATE DATABASE [$DbName];"
$sqlCreateLogin = "IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$DbUser') BEGIN CREATE LOGIN [$DbUser] WITH PASSWORD = N'$DbPassword'; END;"
$sqlCreateUser = "IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$DbUser') BEGIN CREATE USER [$DbUser] FOR LOGIN [$DbUser]; END; EXEC sp_addrolemember 'db_owner', '$DbUser';"

sqlcmd -S $Server -U $SaUser -P $SaPassword -Q $sqlCreateDb
sqlcmd -S $Server -U $SaUser -P $SaPassword -Q $sqlCreateLogin
sqlcmd -S $Server -U $SaUser -P $SaPassword -d $DbName -Q $sqlCreateUser

Write-Host "Database initialization complete."
