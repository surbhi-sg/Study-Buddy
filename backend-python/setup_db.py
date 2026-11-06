"""Create (or reset) the studybuddy database on XAMPP and load the schema and demo data.

Run from the backend-python folder, with MySQL started in the XAMPP Control Panel:
    python setup_db.py

It drops the studybuddy database if it exists, then loads, in order:
    ../schema.sql      (P1: 9 tables, constraints, availability triggers)
    ../db/seed.sql     (P4: 42 students, 13 groups, 50 sessions; dates relative to today)
Run it again before every demo to get fresh data.
"""
import os
import sys

import pymysql

import config

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = [os.path.join(HERE, "..", "schema.sql"), os.path.join(HERE, "..", "db", "seed.sql")]


def split_sql(text):
    """Split a .sql file into statements. Understands DELIMITER (used around triggers),
    quoted strings and -- / # / /* */ comments, like the mysql command-line client."""
    statements, buf, delim = [], [], ";"
    i, n = 0, len(text)
    quote = None
    at_line_start = True
    while i < n:
        c = text[i]
        if quote:                                   # inside '...' or "..." or `...`
            buf.append(c)
            if c == "\\" and quote != "`" and i + 1 < n:
                buf.append(text[i + 1]); i += 2; continue
            if c == quote:
                quote = None
            i += 1; continue
        if at_line_start and text[i:i + 9].upper() == "DELIMITER":
            end = text.find("\n", i)
            end = n if end == -1 else end
            delim = text[i + 9:end].strip()
            i = end + 1; continue
        if c in "'\"`":
            quote = c; buf.append(c); i += 1; at_line_start = False; continue
        if text.startswith("--", i) and (i + 2 >= n or text[i + 2] in " \t\r\n") or c == "#":
            end = text.find("\n", i)
            i = n if end == -1 else end; continue
        if text.startswith("/*", i):
            end = text.find("*/", i + 2)
            i = n if end == -1 else end + 2; continue
        if text.startswith(delim, i):
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []; i += len(delim); at_line_start = False; continue
        buf.append(c)
        at_line_start = c == "\n" or (at_line_start and c in " \t\r")
        i += 1
    stmt = "".join(buf).strip()
    if stmt:
        statements.append(stmt)
    return statements


def main():
    for f in FILES:
        if not os.path.exists(f):
            sys.exit(f"Missing file: {os.path.normpath(f)}. Run this from the backend-python folder of the repo.")
    try:
        conn = pymysql.connect(host=config.DB_HOST, port=config.DB_PORT, user=config.DB_USER,
                               password=config.DB_PASSWORD, charset="utf8mb4", autocommit=True)
    except pymysql.MySQLError as e:
        sys.exit(f"Cannot connect to MySQL at {config.DB_HOST}:{config.DB_PORT} as {config.DB_USER}: {e.args[-1]}\n"
                 "Start MySQL in the XAMPP Control Panel, and set DB_PASSWORD if your root user has one.")
    with conn.cursor() as cur:
        cur.execute("SELECT VERSION()")
        print("Connected to", cur.fetchone()[0])
        cur.execute(f"DROP DATABASE IF EXISTS `{config.DB_NAME}`")
        cur.execute(f"CREATE DATABASE `{config.DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cur.execute(f"USE `{config.DB_NAME}`")
        cur.execute("SET time_zone = '+00:00'")
        for f in FILES:
            with open(f, encoding="utf-8") as fh:
                stmts = split_sql(fh.read())
            for s in stmts:
                try:
                    cur.execute(s)
                except pymysql.MySQLError as e:
                    sys.exit(f"\nError in {os.path.basename(f)}: {e.args[-1]}\nStatement:\n{s[:400]}")
            print(f"Loaded {os.path.basename(f)} ({len(stmts)} statements)")
        cur.execute("""SELECT (SELECT COUNT(*) FROM student), (SELECT COUNT(*) FROM study_group),
                              (SELECT COUNT(*) FROM study_session)""")
        s, g, ss = cur.fetchone()
    conn.close()
    print(f"\n{config.DB_NAME} is ready: {s} students, {g} groups, {ss} sessions.")
    print("Demo login: riya@studybuddy.test / password123")


if __name__ == "__main__":
    main()
