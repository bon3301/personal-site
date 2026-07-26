import hashlib
import hmac
import os

from datetime import datetime, timedelta, timezone

from flask import current_app, request
from sqlalchemy.exc import SQLAlchemyError

from api.database import get_session
from api.models import AdminLoginLimit


MAX_FAILED_ATTEMPTS = 3
LIMIT_PERIOD = timedelta(days=1)


def get_client_fingerprint():
    if os.getenv("VERCEL_ENV") in {
        "preview",
        "production"
    }:
        client_ip = request.headers.get(
            "x-vercel-forwarded-for"
        )
    else:
        client_ip = request.remote_addr

    client_ip = client_ip or "unknown"

    return hmac.new(
        str(current_app.secret_key).encode("utf-8"),
        client_ip.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def is_login_locked(fingerprint):
    database_session = None

    try:
        database_session = get_session()

        limit = database_session.get(
            AdminLoginLimit,
            fingerprint
        )

        if limit is None:
            return False

        now = datetime.now(timezone.utc)

        if (
            limit.locked_until is not None
            and limit.locked_until > now
        ):
            return True

        if (
            limit.window_started_at
            <= now - LIMIT_PERIOD
        ):
            database_session.delete(limit)
            database_session.commit()

        return False

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to check the login limit"
        )

        return False

    finally:
        if database_session is not None:
            database_session.close()


def record_failed_login(fingerprint):
    database_session = None

    try:
        database_session = get_session()
        now = datetime.now(timezone.utc)

        limit = database_session.get(
            AdminLoginLimit,
            fingerprint
        )

        if (
            limit is None
            or limit.window_started_at
            <= now - LIMIT_PERIOD
        ):
            if limit is None:
                limit = AdminLoginLimit(
                    fingerprint=fingerprint,
                    failed_attempts=1,
                    window_started_at=now,
                    locked_until=None
                )

                database_session.add(limit)
            else:
                limit.failed_attempts = 1
                limit.window_started_at = now
                limit.locked_until = None
        else:
            limit.failed_attempts += 1

        if (
            limit.failed_attempts
            >= MAX_FAILED_ATTEMPTS
        ):
            limit.locked_until = now + LIMIT_PERIOD

        database_session.commit()

        return limit.locked_until is not None

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to record a login attempt"
        )

        return False

    finally:
        if database_session is not None:
            database_session.close()


def clear_login_limit(fingerprint):
    database_session = None

    try:
        database_session = get_session()

        limit = database_session.get(
            AdminLoginLimit,
            fingerprint
        )

        if limit is not None:
            database_session.delete(limit)
            database_session.commit()

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to clear the login limit"
        )

    finally:
        if database_session is not None:
            database_session.close()
