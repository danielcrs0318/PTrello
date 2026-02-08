#!/usr/bin/env bash
set -euo pipefail

HOST="${DB_HOST:-sqlserver}"
SA_PASSWORD="${SA_PASSWORD:?}"
DB_NAME="${DB_NAME:-SprintFlow}"
DB_USER="${DB_USER:-Molina}"
DB_PASSWORD="${DB_PASSWORD:-SqlServer@123}"

echo "Waiting for SQL Server to be ready..."
for _ in {1..30}; do
  if /opt/mssql-tools18/bin/sqlcmd -S "$HOST" -U sa -P "$SA_PASSWORD" -Q "SELECT 1" -C > /dev/null 2>&1; then
    break
  fi
  sleep 2
done

/opt/mssql-tools18/bin/sqlcmd -S "$HOST" -U sa -P "$SA_PASSWORD" -Q "IF DB_ID(N'$DB_NAME') IS NULL CREATE DATABASE [$DB_NAME];" -C

/opt/mssql-tools18/bin/sqlcmd -S "$HOST" -U sa -P "$SA_PASSWORD" -Q "IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$DB_USER') BEGIN CREATE LOGIN [$DB_USER] WITH PASSWORD = N'$DB_PASSWORD'; END;" -C

/opt/mssql-tools18/bin/sqlcmd -S "$HOST" -U sa -P "$SA_PASSWORD" -d "$DB_NAME" -Q "IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$DB_USER') BEGIN CREATE USER [$DB_USER] FOR LOGIN [$DB_USER]; END; EXEC sp_addrolemember 'db_owner', '$DB_USER';" -C

echo "Database initialization complete."
