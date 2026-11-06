"""Study Buddy backend (Python + Flask) for XAMPP's MySQL/MariaDB.

Run:   python app.py        -> http://localhost:3000   (the React frontend forwards /api here)
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

from flask import Flask, jsonify
from flask.json.provider import DefaultJSONProvider

import config
import db
import errors
import validate as v
from routes import auth, dashboard, groups, match, profile, sessions


class JSONProvider(DefaultJSONProvider):
    """How database values are sent to the browser."""
    @staticmethod
    def default(o):
        if isinstance(o, datetime):
            return o.strftime("%Y-%m-%dT%H:%M:%S") + "Z"   # stored in UTC
        if isinstance(o, date):
            return o.isoformat()
        if isinstance(o, timedelta):                          # TIME columns
            return v.hhmm(o)
        if isinstance(o, Decimal):
            return float(o)
        return DefaultJSONProvider.default(o)


def create_app():
    app = Flask(__name__)
    app.json = JSONProvider(app)
    app.json.sort_keys = False
    app.teardown_appcontext(db.close_conn)
    errors.register(app)

    @app.get("/api/health")
    def health():
        try:
            db.query("SELECT 1")
            return jsonify({"status": "ok", "db": "connected"})
        except Exception:
            return jsonify({"status": "error", "db": "unreachable"}), 500

    for module in (auth, profile, dashboard, groups, match, sessions):
        app.register_blueprint(module.bp)
    return app


app = create_app()

if __name__ == "__main__":
    print(f"Study Buddy API on http://localhost:{config.PORT}  (database {config.DB_NAME} on {config.DB_HOST}:{config.DB_PORT})")
    app.run(host="127.0.0.1", port=config.PORT, debug=False, threaded=True)
