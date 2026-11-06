"""Errors always reach the frontend as JSON: {"error": "readable text", "code": "CODE"}."""
import pymysql
from flask import jsonify


class HttpError(Exception):
    def __init__(self, status, code, message, details=None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details


# MySQL / MariaDB error numbers -> HTTP answer
DB_ERRORS = {
    1062: (409, "ALREADY_EXISTS", "Already exists"),           # duplicate primary key / UNIQUE
    1452: (404, "NOT_FOUND", "Related record not found"),     # foreign key points nowhere
    1451: (409, "IN_USE", "Still in use"),                    # row is referenced (ON DELETE RESTRICT)
    1048: (400, "VALIDATION_ERROR", "Field is required"),     # NOT NULL
    3819: (400, "VALIDATION_ERROR", "Value out of range"),    # CHECK constraint (MySQL)
    4025: (400, "VALIDATION_ERROR", "Value out of range"),    # CHECK constraint (MariaDB / XAMPP)
}


def register(app):
    @app.errorhandler(HttpError)
    def _http(err):
        body = {"error": err.message, "code": err.code}
        if err.details:
            body["details"] = err.details
        return jsonify(body), err.status

    @app.errorhandler(pymysql.MySQLError)
    def _db(err):
        errno = err.args[0] if err.args else None
        msg = err.args[1] if len(err.args) > 1 else str(err)
        if errno == 1644:   # SIGNAL from a trigger, e.g. P1's availability overlap trigger
            if ":" in msg and msg.split(":", 1)[0].isupper():
                code, text = (s.strip() for s in msg.split(":", 1))
            else:
                code, text = ("SLOT_OVERLAP" if "overlap" in msg.lower() else "CONFLICT"), msg
            return jsonify({"error": text, "code": code}), 409
        if errno in DB_ERRORS:
            status, code, text = DB_ERRORS[errno]
            return jsonify({"error": text, "code": code}), status
        if errno in (2003, 1045, 1049):   # can't connect / access denied / unknown database
            app.logger.error("Database problem: %s", msg)
            return jsonify({"error": "Database unavailable. Is MySQL running in XAMPP?", "code": "DB_UNAVAILABLE"}), 503
        app.logger.exception(err)
        return jsonify({"error": "Internal server error", "code": "INTERNAL_ERROR"}), 500

    @app.errorhandler(404)
    def _not_found(_e):
        return jsonify({"error": "Route not found", "code": "NOT_FOUND"}), 404

    @app.errorhandler(405)
    def _method(_e):
        return jsonify({"error": "Method not allowed", "code": "NOT_FOUND"}), 405

    @app.errorhandler(400)
    def _bad(_e):
        return jsonify({"error": "Invalid JSON", "code": "VALIDATION_ERROR"}), 400
