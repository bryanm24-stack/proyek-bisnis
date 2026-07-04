SQL setup generated from workspace JSON files.

File:
- proyek_bisnis.sql : create database, schema, and import initial JSON-derived data

Usage (MySQL):

Run from the repository root:

```bash
mysql -u <user> -p < sql/proyek_bisnis.sql
```

Notes:
- The script creates and uses the `rent_guard` database directly.
- The SQL targets MySQL.
- On Windows PowerShell, run the MySQL command from the project root; ensure `mysql` is in PATH.

