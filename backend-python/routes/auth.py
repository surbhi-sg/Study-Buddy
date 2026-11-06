"""Register, login and "who am I". Passwords are stored only as bcrypt hashes; login returns a JWT."""
import re
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from flask import Blueprint, g, jsonify, request

import config
import db
from errors import HttpError

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
# Checked when the email is unknown, so a wrong email and a wrong password take the same time
DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt(10))


def make_token(student_id):
    exp = datetime.now(timezone.utc) + timedelta(hours=config.JWT_HOURS)
    return jwt.encode({"id": student_id, "exp": exp}, config.JWT_SECRET, algorithm="HS256")


def login_required(view):
    """Put on any route that needs a logged-in student. Sets g.user_id from the Bearer token."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        scheme, _, token = request.headers.get("Authorization", "").partition(" ")
        if scheme != "Bearer" or not token:
            raise HttpError(401, "UNAUTHENTICATED", "Authentication required")
        try:
            g.user_id = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])["id"]
        except jwt.PyJWTError:
            raise HttpError(401, "UNAUTHENTICATED", "Invalid or expired token")
        return view(*args, **kwargs)
    return wrapper


def public_student(row):
    return {k: row[k] for k in ("student_id", "name", "email", "year", "branch")}


@bp.post("/register")
def register():
    b = request.get_json(silent=True) or {}
    name = str(b.get("name") or "").strip()
    email = str(b.get("email") or "").strip().lower()
    branch = str(b.get("branch") or "").strip()
    password, year = b.get("password"), b.get("year")

    details = {}
    if not name or len(name) > 100:
        details["name"] = "is required (at most 100 characters)"
    if not EMAIL_RE.match(email) or len(email) > 255:
        details["email"] = "must be a valid email"
    if not isinstance(password, str) or not 8 <= len(password) <= 72:
        details["password"] = "must be 8 to 72 characters"      # bcrypt ignores bytes after 72
    if isinstance(year, bool) or not isinstance(year, int) or not 1 <= year <= 6:
        details["year"] = "is required (whole number from 1 to 6)"
    if not branch or len(branch) > 60:
        details["branch"] = "is required (at most 60 characters)"
    if details:
        raise HttpError(400, "VALIDATION_ERROR", "Invalid input", details)

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode()
    # A duplicate email raises error 1062, which errors.py turns into 409 ALREADY_EXISTS
    _, new_id = db.execute(
        "INSERT INTO student (name, email, password_hash, year, branch) VALUES (%s, %s, %s, %s, %s)",
        (name, email, pw_hash, year, branch))
    student = {"student_id": new_id, "name": name, "email": email, "year": year, "branch": branch}
    return jsonify({"token": make_token(new_id), "student": student}), 201


@bp.post("/login")
def login():
    b = request.get_json(silent=True) or {}
    email, password = b.get("email"), b.get("password")
    if not email or not isinstance(password, str) or not password:
        raise HttpError(400, "VALIDATION_ERROR", "email and password are required")
    row = db.query_one(
        "SELECT student_id, name, email, year, branch, password_hash FROM student WHERE email = %s",
        (str(email).strip().lower(),))
    stored = row["password_hash"].encode() if row else DUMMY_HASH
    if not bcrypt.checkpw(password.encode(), stored) or not row:
        raise HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password")
    return jsonify({"token": make_token(row["student_id"]), "student": public_student(row)})


@bp.get("/me")
@login_required
def me():
    row = db.query_one("SELECT student_id, name, email, year, branch FROM student WHERE student_id = %s", (g.user_id,))
    if not row:
        raise HttpError(401, "UNAUTHENTICATED", "Account no longer exists")
    return jsonify(row)
