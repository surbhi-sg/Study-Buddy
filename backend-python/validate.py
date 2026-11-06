"""Input checks shared by the routes. Each raises HttpError(400) with a readable message."""
import re
from datetime import timedelta

from errors import HttpError

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def bad(msg):
    return HttpError(400, "VALIDATION_ERROR", msg)


def pos_int(value, field):
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise bad(f"{field} must be a positive whole number")
    if n < 1 or str(n) != str(value).strip():
        raise bad(f"{field} must be a positive whole number")
    return n


def int_range(value, field, lo, hi):
    if isinstance(value, bool) or not isinstance(value, int) or not lo <= value <= hi:
        raise bad(f"{field} must be {lo} to {hi}")
    return value


def date(value, field="date"):
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise bad(f"{field} must look like YYYY-MM-DD")
    return value


def time(value, field):
    if not isinstance(value, str) or not TIME_RE.match(value):
        raise bad(f"{field} must look like HH:MM")
    return value


def one_of(value, allowed, field):
    if value not in allowed:
        raise bad(f"{field} must be one of: {', '.join(allowed)}")
    return value


def text(value, field, max_len, required=True):
    s = str(value if value is not None else "").strip()
    if required and not s:
        raise bad(f"{field} is required")
    if len(s) > max_len:
        raise bad(f"{field} must be at most {max_len} characters")
    return s


def minutes(t):
    """TIME from the database (timedelta, or 'HH:MM:SS' text), or minutes already -> minutes after midnight."""
    if isinstance(t, int):
        return t
    if isinstance(t, timedelta):
        return int(t.total_seconds() // 60)
    h, m = str(t).split(":")[:2]
    return int(h) * 60 + int(m)


def hhmm(t):
    if t is None:
        return None
    n = minutes(t)
    return f"{n // 60:02d}:{n % 60:02d}"
