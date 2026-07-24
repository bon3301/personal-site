from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Text,
    func
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Post(Base):
    __tablename__ = "posts"

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published')",
            name="post_status_valid"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    slug: Mapped[str] = mapped_column(
        String(160),
        unique=True,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(200)
    )

    excerpt: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True
    )

    content_markdown: Mapped[str] = mapped_column(
        Text,
        default=""
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="draft",
        index=True
    )

    reading_minutes: Mapped[int] = mapped_column(
        Integer,
        default=1
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )