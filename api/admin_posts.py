from flask import Blueprint, current_app, jsonify
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from api.auth import admin_required
from api.database import get_session
from api.models import Post


admin_posts = Blueprint(
    "admin_posts",
    __name__,
    url_prefix="/api/admin"
)


def configure_admin_posts(app):
    app.register_blueprint(admin_posts)


def serialize_post(post):
    return {
        "id": post.id,
        "slug": post.slug,
        "title": post.title,
        "excerpt": post.excerpt,
        "status": post.status,
        "reading_minutes": post.reading_minutes,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat(),
        "published_at": (
            post.published_at.isoformat()
            if post.published_at
            else None
        )
    }


@admin_posts.after_request
def prevent_admin_post_caching(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@admin_posts.get("/posts")
@admin_required
def list_admin_posts():
    database_session = None

    try:
        database_session = get_session()

        statement = (
            select(Post)
            .order_by(
                Post.updated_at.desc(),
                Post.id.desc()
            )
        )

        posts = database_session.scalars(statement).all()

        return jsonify({
            "count": len(posts),
            "posts": [
                serialize_post(post)
                for post in posts
            ]
        })

    except (SQLAlchemyError, RuntimeError):
        current_app.logger.exception(
            "Failed to load admin posts"
        )

        return jsonify({
            "error": "Unable to load admin posts"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()