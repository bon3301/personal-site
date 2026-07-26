import math
import re

from datetime import datetime, timezone

from flask import (
    Blueprint,
    current_app,
    jsonify,
    request
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from api.auth import admin_required, csrf_required
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


def serialize_full_post(post):
    data = serialize_post(post)
    data["content_markdown"] = post.content_markdown

    return data


def calculate_reading_minutes(content):
    word_count = len(content.split())

    return max(
        1,
        math.ceil(word_count / 200)
    )


def make_slug(title):
    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        title.lower()
    ).strip("-")

    return slug[:140].rstrip("-") or "post"


def find_available_slug(database_session, title):
    base_slug = make_slug(title)
    slug = base_slug
    number = 2

    while database_session.scalar(
        select(Post.id).where(Post.slug == slug)
    ) is not None:
        suffix = f"-{number}"
        available_length = 160 - len(suffix)

        slug = (
            f"{base_slug[:available_length].rstrip('-')}"
            f"{suffix}"
        )

        number += 1

    return slug


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


@admin_posts.get("/posts/<int:post_id>")
@admin_required
def get_admin_post(post_id):
    database_session = None

    try:
        database_session = get_session()
        post = database_session.get(Post, post_id)

        if post is None:
            return jsonify({
                "error": "Post not found"
            }), 404

        return jsonify({
            "post": serialize_full_post(post)
        })

    except (SQLAlchemyError, RuntimeError):
        current_app.logger.exception(
            "Failed to load an admin post"
        )

        return jsonify({
            "error": "Unable to load post"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()


@admin_posts.post("/posts")
@admin_required
@csrf_required
def create_admin_post():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON body is required"
        }), 400

    title = data.get("title")

    if not isinstance(title, str):
        return jsonify({
            "error": "A title is required"
        }), 400

    title = title.strip()

    if not title or len(title) > 200:
        return jsonify({
            "error": "Title must be between 1 and 200 characters"
        }), 400

    database_session = None

    try:
        database_session = get_session()

        post = Post(
            title=title,
            slug=find_available_slug(
                database_session,
                title
            ),
            excerpt=None,
            content_markdown="",
            status="draft",
            reading_minutes=1
        )

        database_session.add(post)
        database_session.commit()
        database_session.refresh(post)

        return jsonify({
            "post": serialize_post(post)
        }), 201

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to create an admin post"
        )

        return jsonify({
            "error": "Unable to create post"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()


@admin_posts.patch("/posts/<int:post_id>")
@admin_required
@csrf_required
def update_admin_post(post_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON body is required"
        }), 400

    editable_fields = {
        "title",
        "slug",
        "excerpt",
        "content_markdown"
    }

    if not editable_fields.intersection(data):
        return jsonify({
            "error": "No editable fields were provided"
        }), 400

    if "title" in data:
        if not isinstance(data["title"], str):
            return jsonify({
                "error": "Title must be text"
            }), 400

        title = data["title"].strip()

        if not title or len(title) > 200:
            return jsonify({
                "error": (
                    "Title must be between "
                    "1 and 200 characters"
                )
            }), 400

    if "slug" in data:
        if not isinstance(data["slug"], str):
            return jsonify({
                "error": "slug needs to be text"
            }), 400

        slug = data["slug"].strip()

        if not slug or len(slug) > 160:
            return jsonify({
                "error": (
                    "slug needs to be between "
                    "1 and 160 characters"
                )
            }), 400

        if not re.fullmatch(
            r"[a-z0-9]+(?:-[a-z0-9]+)*",
            slug
        ):
            return jsonify({
                "error": (
                    "url only allows lowercase letters, "
                    "numbers and dashes"
                )
            }), 400

    if "excerpt" in data:
        excerpt = data["excerpt"]

        if excerpt is not None:
            if not isinstance(excerpt, str):
                return jsonify({
                    "error": "Excerpt must be text"
                }), 400

            excerpt = excerpt.strip() or None

            if excerpt and len(excerpt) > 300:
                return jsonify({
                    "error": (
                        "Excerpt cannot exceed "
                        "300 characters"
                    )
                }), 400

    if "content_markdown" in data:
        content_markdown = data["content_markdown"]

        if not isinstance(content_markdown, str):
            return jsonify({
                "error": "Post content must be text"
            }), 400

        if len(content_markdown) > 100000:
            return jsonify({
                "error": "Post content is too large"
            }), 400

    database_session = None

    try:
        database_session = get_session()
        post = database_session.get(Post, post_id)

        if post is None:
            return jsonify({
                "error": "Post not found"
            }), 404

        if "slug" in data:
            if (
                post.status == "published"
                and slug != post.slug
            ):
                return jsonify({
                    "error": (
                        "unpublish before changing the url"
                    )
                }), 409

            existing_post_id = database_session.scalar(
                select(Post.id).where(
                    Post.slug == slug,
                    Post.id != post_id
                )
            )

            if existing_post_id is not None:
                return jsonify({
                    "error": (
                        "that url is already being used :/"
                    )
                }), 409

        if "title" in data:
            post.title = title

        if "slug" in data:
            post.slug = slug

        if "excerpt" in data:
            post.excerpt = excerpt

        if "content_markdown" in data:
            post.content_markdown = content_markdown
            post.reading_minutes = (
                calculate_reading_minutes(
                    content_markdown
                )
            )

        database_session.commit()
        database_session.refresh(post)

        return jsonify({
            "post": serialize_full_post(post)
        })

    except IntegrityError:
        if database_session is not None:
            database_session.rollback()

        return jsonify({
            "error": "that url is already being used :/"
        }), 409

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to update an admin post"
        )

        return jsonify({
            "error": "Unable to update post"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()


@admin_posts.post("/posts/<int:post_id>/publish")
@admin_required
@csrf_required
def publish_admin_post(post_id):
    database_session = None

    try:
        database_session = get_session()
        post = database_session.get(Post, post_id)

        if post is None:
            return jsonify({
                "error": "post not found :/"
            }), 404

        if not post.content_markdown.strip():
            return jsonify({
                "error": (
                    "write something before publishing"
                )
            }), 400

        if post.status != "published":
            post.status = "published"
            post.published_at = datetime.now(
                timezone.utc
            )

            database_session.commit()
            database_session.refresh(post)

        return jsonify({
            "post": serialize_full_post(post)
        })

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "failed to publish post"
        )

        return jsonify({
            "error": "unable to publish post"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()


@admin_posts.post("/posts/<int:post_id>/unpublish")
@admin_required
@csrf_required
def unpublish_admin_post(post_id):
    database_session = None

    try:
        database_session = get_session()
        post = database_session.get(Post, post_id)

        if post is None:
            return jsonify({
                "error": "post not found :/"
            }), 404

        if post.status != "draft":
            post.status = "draft"
            post.published_at = None

            database_session.commit()
            database_session.refresh(post)

        return jsonify({
            "post": serialize_full_post(post)
        })

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "unable to unpublish..."
        )

        return jsonify({
            "error": "unable to unpublish post"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()


@admin_posts.delete("/posts/<int:post_id>")
@admin_required
@csrf_required
def delete_admin_post(post_id):
    database_session = None

    try:
        database_session = get_session()
        post = database_session.get(Post, post_id)

        if post is None:
            return jsonify({
                "error": "post not found :/"
            }), 404

        if post.status == "published":
            return jsonify({
                "error": (
                    "unpublish it before deleting"
                )
            }), 409

        database_session.delete(post)
        database_session.commit()

        return jsonify({
            "deleted": True,
            "post_id": post_id
        })

    except (SQLAlchemyError, RuntimeError):
        if database_session is not None:
            database_session.rollback()

        current_app.logger.exception(
            "Failed to delete an admin post"
        )

        return jsonify({
            "error": "couldn't delete the post :/"
        }), 500

    finally:
        if database_session is not None:
            database_session.close()