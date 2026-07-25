import { marked } from 'marked';
import DOMPurify from 'dompurify';

const articleShell = document.getElementById('article-shell');
const articleHeader = document.getElementById('article-header');
const articleTitle = document.getElementById('article-title');
const articleExcerpt = document.getElementById('article-excerpt');
const articleDate = document.getElementById('article-date');
const articleReadingTime = document.getElementById(
    'article-reading-time'
);
const articleContent = document.getElementById('article-content');
const articleMessage = document.getElementById('article-message');

function getPostSlug() {
    const pathParts = window.location.pathname
        .split('/')
        .filter(Boolean);

    if (
        pathParts.length !== 2 ||
        pathParts[0] !== 'blog'
    ) {
        return null;
    }

    return decodeURIComponent(pathParts[1]);
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function renderPost(post) {
    document.title = `${post.title} | bon3301`;

    articleTitle.textContent = post.title;

    if (post.excerpt) {
        articleExcerpt.textContent = post.excerpt;
        articleExcerpt.hidden = false;
    }

    articleDate.dateTime = post.published_at;
    articleDate.textContent = formatDate(
        post.published_at
    );

    articleReadingTime.textContent =
        `${post.reading_minutes} min read`;

    if (post.content_markdown.trim()) {
        const parsedMarkdown = marked.parse(
            post.content_markdown
        );

        articleContent.innerHTML = DOMPurify.sanitize(
            parsedMarkdown,
            {
                USE_PROFILES: {
                    html: true
                }
            }
        );

        for (
            const link of articleContent.querySelectorAll('a')
        ) {
            const url = new URL(
                link.href,
                window.location.origin
            );

            if (url.origin !== window.location.origin) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
        }
    } else {
        articleContent.textContent =
            'This post has no content yet.';
    }

    articleHeader.hidden = false;
    articleMessage.hidden = true;
}

async function loadPost() {
    const slug = getPostSlug();

    if (!slug) {
        articleMessage.textContent =
            'This post is not available.';

        articleShell.setAttribute('aria-busy', 'false');
        return;
    }

    try {
        const response = await fetch(
            `/api/posts/${encodeURIComponent(slug)}`
        );

        if (response.status === 404) {
            throw new Error(
                'This post is not available.'
            );
        }

        if (!response.ok) {
            throw new Error(
                'This post could not be loaded.'
            );
        }

        const data = await response.json();

        renderPost(data.post);
    } catch (error) {
        articleMessage.textContent = error.message;

        console.error(
            'Public post loading failed:',
            error
        );
    } finally {
        articleShell.setAttribute('aria-busy', 'false');
    }
}

loadPost();
