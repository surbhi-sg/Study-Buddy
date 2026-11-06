"""Database access: one PyMySQL connection per request, closed when the request ends."""
import pymysql
from flask import g

import config


def connect(database=config.DB_NAME):
    return pymysql.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,   # rows come back as dicts: row["name"]
        autocommit=True,                          # each statement commits, except inside transaction()
        init_command="SET time_zone = '+00:00'",  # DATETIME values are UTC (see schema.sql)
    )


def get_conn():
    if "db" not in g:
        g.db = connect()
    return g.db


def close_conn(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def query(sql, params=None):
    """Run a SELECT and return all rows (list of dicts). Always parameterized: never format values into sql."""
    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def query_one(sql, params=None):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    """Run INSERT/UPDATE/DELETE. Returns (rowcount, lastrowid)."""
    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount, cur.lastrowid


class transaction:
    """with transaction() as cur:  ...  -> COMMIT at the end, ROLLBACK if anything raises."""

    def __enter__(self):
        self.conn = get_conn()
        self.conn.begin()
        self.cur = self.conn.cursor()
        return self.cur

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type is None:
                self.conn.commit()
            else:
                self.conn.rollback()
        finally:
            self.cur.close()
        return False   # re-raise any error so the error handler can answer
