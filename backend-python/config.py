"""Settings for the Study Buddy Python backend.

Defaults match a fresh XAMPP install (MySQL/MariaDB on port 3306, user root, no password).
To change one, set an environment variable before starting, e.g. in PowerShell:
    $env:DB_PASSWORD = "mypassword"
"""
import os

DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")          # XAMPP's root has no password by default
DB_NAME = os.environ.get("DB_NAME", "studybuddy")

PORT = int(os.environ.get("PORT", "3000"))               # the React frontend forwards /api to this port
JWT_SECRET = os.environ.get("JWT_SECRET", "studybuddy-dev-secret-change-me")
JWT_HOURS = int(os.environ.get("JWT_HOURS", "2"))

# Local time zone of the users (India). Availability slots are local time; sessions are stored in UTC.
TZ = os.environ.get("APP_TZ_OFFSET", "+05:30")
