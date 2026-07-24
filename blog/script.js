const postList = document.getElementById('post-list');

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function showMessage(message) {
    const paragraph = document.createElement('p');

    paragraph.className = 'post-message';
    paragraph.textContent = message;

    postList.replaceChildren(paragraph);
}

function createPostRow(post) {
    const row = document.createElement('a');
    const title = document.createElement('h2');
    const meta = document.createElement('div');
    const date = document.createElement('time');
    const readingTime = document.createElement('span');
    const arrow = document.createElement('span');

    row.className = 'post-row';
    row.href = `/blog/${encodeURIComponent(post.slug)}/`;

    title.className = 'post-title';
    title.textContent = post.title;

    meta.className = 'post-meta';

    date.dateTime = post.published_at;
    date.textContent = formatDate(post.published_at);

    readingTime.textContent =
        `${post.reading_minutes} min read`;

    arrow.className = 'post-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';

    meta.append(date, readingTime);
    row.append(title, meta, arrow);

    return row;
}

function renderPosts(posts) {
    postList.replaceChildren();

    if (posts.length === 0) {
        showMessage('No posts yet.');
        return;
    }

    for (const post of posts) {
        postList.append(createPostRow(post));
    }
}

async function loadPosts() {
    try {
        const response = await fetch('/api/posts');

        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const data = await response.json();
        renderPosts(data.posts);
    } catch (error) {
        console.error('Blog error:', error);
        showMessage('Posts could not be loaded right now.');
    } finally {
        postList.setAttribute('aria-busy', 'false');
    }
}

loadPosts();