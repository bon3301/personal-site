import os
import secrets

from functools import wraps

from flask import (
    Blueprint,
    current_app,
    jsonify,
    request,
    session
)
from werkzeug.security import check_password_hash

from api.login_limit import (
    clear_login_limit,
    get_client_fingerprint,
    is_login_locked,
    record_failed_login
)


admin_auth = Blueprint(
    "admin_auth",
    __name__,
    url_prefix="/api/admin"
)


def configure_admin_auth(app):
    secret_key = os.getenv("FLASK_SECRET_KEY")

    if secret_key:
        app.secret_key = secret_key

    app.config.update(
        SESSION_COOKIE_NAME="portfolio_admin_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Strict",
        SESSION_COOKIE_SECURE=(
            os.getenv("VERCEL_ENV")
            in {"preview", "production"}
        )
    )

    app.register_blueprint(admin_auth)


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if session.get("is_admin") is not True:
            return jsonify({
                "error": "Authentication required"
            }), 401

        return view(*args, **kwargs)

    return wrapped


def csrf_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        expected_token = session.get("csrf_token")
        supplied_token = request.headers.get("X-CSRF-Token")

        if (
            not expected_token
            or not supplied_token
            or not secrets.compare_digest(
                expected_token,
                supplied_token
            )
        ):
            return jsonify({
                "error": "Invalid CSRF token"
            }), 403

        return view(*args, **kwargs)

    return wrapped


@admin_auth.after_request
def prevent_admin_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@admin_auth.get("/session")
def session_status():
    authenticated = session.get("is_admin") is True

    response = {
        "authenticated": authenticated
    }

    if authenticated:
        response["csrf_token"] = session.get("csrf_token")

    return jsonify(response)


@admin_auth.post("/login")
def login():
    password_hash = os.getenv("ADMIN_PASSWORD_HASH")

    if not current_app.secret_key or not password_hash:
        return jsonify({
            "error": "Admin authentication is not configured"
        }), 503

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON body is required"
        }), 400

    password = data.get("password")

    if (
        not isinstance(password, str)
        or not password
        or len(password) > 512
    ):
        return jsonify({
            "error": "A valid password is required"
        }), 400

    fingerprint = get_client_fingerprint()

    if is_login_locked(fingerprint):
        session.clear()
        return "", 429

    if not check_password_hash(password_hash, password):
        locked = record_failed_login(fingerprint)
        session.clear()

        if locked:
            return "", 429

        return jsonify({
            "error": "Invalid credentials"
        }), 401

    clear_login_limit(fingerprint)

    session.clear()
    session["is_admin"] = True
    session["csrf_token"] = secrets.token_urlsafe(32)

    return jsonify({
        "authenticated": True,
        "csrf_token": session["csrf_token"]
    })


@admin_auth.post("/logout")
@admin_required
@csrf_required
def logout():
    session.clear()

    return jsonify({
        "authenticated": False
    })