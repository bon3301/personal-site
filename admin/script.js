import { marked } from 'marked';
import DOMPurify from 'dompurify';

const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('admin-password');
const loginButton = document.getElementById('login-button');
const authMessage = document.getElementById('auth-message');

const adminSession = document.getElementById('admin-session');
const logoutButton = document.getElementById('logout-button');
const sessionMessage = document.getElementById('session-message');

const adminPanel = document.querySelector('.admin-panel');
const adminPostList = document.getElementById('admin-post-list');

const newPostButton = document.getElementById('new-post-button');
const newPostForm = document.getElementById('new-post-form');
const newPostTitle = document.getElementById('new-post-title');
const createPostButton = document.getElementById('create-post-button');
const cancelPostButton = document.getElementById('cancel-post-button');
const newPostMessage = document.getElementById('new-post-message');

const dashboardView = document.getElementById('dashboard-view');
const postEditor = document.getElementById('post-editor');
const editorBackButton = document.getElementById('editor-back-button');
const editorMeta = document.getElementById('editor-meta');
const editorTitle = document.getElementById('editor-title');
const editorExcerpt = document.getElementById('editor-excerpt');
const editorContent = document.getElementById('editor-content');
const savePostButton = document.getElementById('save-post-button');
const editorReadingTime = document.getElementById('editor-reading-time');
const editorMessage = document.getElementById('editor-message');
const markdownPreview = document.getElementById('markdown-preview');
const publishButton = document.getElementById('publish-button');

let csrfToken = null;
let activePostId = null;
let editorIsDirty = false;
let activePostStatus = null;

function setMessage(element, message, state = '') {
    element.textContent = message;

    if (state) {
        element.dataset.state = state;
    } else {
        delete element.dataset.state;
    }
}

function showLogin() {
    csrfToken = null;
    loginForm.hidden = false;
    adminSession.hidden = true;
    adminPanel.classList.remove('dashboard-open');
    closeNewPostForm();

    activePostId = null;
    activePostStatus = null;
    editorIsDirty = false;
    dashboardView.hidden = false;
    postEditor.hidden = true;
}

function showAdmin(token) {
    csrfToken = token;
    loginForm.hidden = true;
    adminSession.hidden = false;
    adminPanel.classList.add('dashboard-open');
    setMessage(sessionMessage, '');

    activePostId = null;
    activePostStatus = null;
    editorIsDirty = false;
    dashboardView.hidden = false;
    postEditor.hidden = true;

    loadAdminPosts();
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

function formatAdminDate(value) {
    const date = new Date(value);

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function showPostMessage(message) {
    const paragraph = document.createElement('p');

    paragraph.className = 'admin-post-message';
    paragraph.textContent = message;

    adminPostList.replaceChildren(paragraph);
}

function createAdminPostRow(post) {
    const row = document.createElement('button');
    const title = document.createElement('span');
    const meta = document.createElement('div');
    const status = document.createElement('span');
    const updated = document.createElement('time');

    row.className = 'admin-post-row';
    row.type = 'button';

    row.addEventListener('click', () => {
        openPostEditor(post.id);
    });

    title.className = 'admin-post-title';
    title.textContent = post.title;

    meta.className = 'admin-post-meta';

    status.className = 'admin-post-status';
    status.dataset.status = post.status;
    status.textContent = post.status;

    updated.dateTime = post.updated_at;
    updated.textContent =
        `updated ${formatAdminDate(post.updated_at)}`;

    meta.append(status, updated);
    row.append(title, meta);

    return row;
}

function renderAdminPosts(posts) {
    adminPostList.replaceChildren();

    if (posts.length === 0) {
        showPostMessage('No posts yet.');
        return;
    }

    for (const post of posts) {
        adminPostList.append(createAdminPostRow(post));
    }
}

async function loadAdminPosts() {
    adminPostList.setAttribute('aria-busy', 'true');
    showPostMessage('loading posts...');

    try {
        const response = await fetch('/api/admin/posts', {
            credentials: 'same-origin'
        });

        if (response.status === 401) {
            showLogin();
            setMessage(authMessage, 'session expired');
            return;
        }

        const data = await readResponse(response);

        renderAdminPosts(data.posts);
    } catch (error) {
        showPostMessage('Posts could not be loaded.');

        console.error(
            'Admin post loading failed:',
            error
        );
    } finally {
        adminPostList.setAttribute('aria-busy', 'false');
    }
}

function renderMarkdownPreview() {
    const markdown = editorContent.value;

    if (!markdown.trim()) {
        markdownPreview.classList.add('empty');
        markdownPreview.textContent =
            'Nothing to preview yet.';

        return;
    }

    const parsedMarkdown = marked.parse(markdown);

    const safeHtml = DOMPurify.sanitize(
        parsedMarkdown,
        {
            USE_PROFILES: {
                html: true
            }
        }
    );

    markdownPreview.classList.remove('empty');
    markdownPreview.innerHTML = safeHtml;
}

function estimateReadingMinutes(content) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
        return 1;
    }

    const wordCount = trimmedContent.split(/\s+/).length;

    return Math.max(
        1,
        Math.ceil(wordCount / 200)
    );
}

function updateEditorReadingTime() {
    const minutes = estimateReadingMinutes(
        editorContent.value
    );

    editorReadingTime.textContent =
        `${minutes} min read`;
}

function setEditorDisabled(disabled) {
    editorTitle.disabled = disabled;
    editorExcerpt.disabled = disabled;
    editorContent.disabled = disabled;
    savePostButton.disabled = disabled;
    publishButton.disabled = disabled;
}

function updateEditorStatus(post) {
    activePostStatus = post.status;

    editorMeta.textContent =
        `${post.status} / ${post.slug}`;

    publishButton.dataset.status = post.status;

    publishButton.textContent = (
        post.status === 'published'
            ? 'unpublish'
            : 'publish'
    );
}

async function openPostEditor(postId) {
    activePostId = postId;
    editorIsDirty = false;

    dashboardView.hidden = true;
    postEditor.hidden = false;

    postEditor.reset();
    editorMeta.textContent = 'loading post...';
    editorMessage.textContent = 'loading...';

    setEditorDisabled(true);

    let loaded = false;

    try {
        const response = await fetch(
            `/api/admin/posts/${postId}`,
            {
                credentials: 'same-origin'
            }
        );

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await readResponse(response);
        const post = data.post;

        editorTitle.value = post.title;
        editorExcerpt.value = post.excerpt || '';
        editorContent.value = post.content_markdown;
        renderMarkdownPreview();

        updateEditorStatus(post);

        editorReadingTime.textContent =
            `${post.reading_minutes} min read`;

        editorMessage.textContent = '';
        loaded = true;
    } catch (error) {
        editorMessage.textContent = error.message;

        console.error(
            'Post loading failed:',
            error
        );
    } finally {
        setEditorDisabled(!loaded);
    }
}

function closePostEditor() {
    if (
        editorIsDirty &&
        !window.confirm('Discard unsaved changes?')
    ) {
        return;
    }

    activePostId = null;
    editorIsDirty = false;

    postEditor.hidden = true;
    dashboardView.hidden = false;

    postEditor.reset();
    editorMessage.textContent = '';

    loadAdminPosts();
}

function openNewPostForm() {
    newPostForm.hidden = false;
    newPostButton.hidden = true;
    newPostTitle.focus();
}

function closeNewPostForm() {
    newPostForm.hidden = true;
    newPostButton.hidden = false;
    newPostForm.reset();
    newPostMessage.textContent = '';
}

async function checkSession() {
    loginButton.disabled = true;
    setMessage(authMessage, 'checking session...');

    try {
        const response = await fetch('/api/admin/session', {
            credentials: 'same-origin'
        });

        const data = await readResponse(response);

        if (
            data.authenticated &&
            typeof data.csrf_token === 'string'
        ) {
            showAdmin(data.csrf_token);
        } else {
            showLogin();
            setMessage(authMessage, '');
        }
    } catch (error) {
        showLogin();
        setMessage(
            authMessage,
            'could not check the current session',
            'error'
        );

        console.error('Session check failed:', error);
    } finally {
        loginButton.disabled = false;
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    passwordInput.setAttribute('aria-invalid', 'false');

    loginButton.disabled = true;
    setMessage(authMessage, 'signing in...');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: passwordInput.value
            })
        });

        const data = await readResponse(response);

        if (
            !data.authenticated ||
            typeof data.csrf_token !== 'string'
        ) {
            throw new Error('Invalid login response');
        }

        passwordInput.value = '';
        showAdmin(data.csrf_token);
    } catch (error) {
        passwordInput.setAttribute('aria-invalid', 'true');
        passwordInput.select();

        setMessage(
            authMessage,
            error.message,
            'error'
        );
    } finally {
        loginButton.disabled = false;
    }
});

newPostButton.addEventListener('click', () => {
    openNewPostForm();
});

cancelPostButton.addEventListener('click', () => {
    closeNewPostForm();
});

newPostForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = newPostTitle.value.trim();

    if (!title) {
        newPostTitle.focus();
        return;
    }

    createPostButton.disabled = true;
    cancelPostButton.disabled = true;
    newPostMessage.textContent = 'creating draft...';

    try {
        const response = await fetch('/api/admin/posts', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                title
            })
        });

        if (response.status === 401) {
            showLogin();
            return;
        }

        await readResponse(response);

        closeNewPostForm();
        await loadAdminPosts();
    } catch (error) {
        newPostMessage.textContent = error.message;

        console.error(
            'Draft creation failed:',
            error
        );
    } finally {
        createPostButton.disabled = false;
        cancelPostButton.disabled = false;
    }
});

editorBackButton.addEventListener('click', () => {
    closePostEditor();
});

editorTitle.addEventListener('input', () => {
    editorIsDirty = true;
});

editorExcerpt.addEventListener('input', () => {
    editorIsDirty = true;
});

editorContent.addEventListener('input', () => {
    editorIsDirty = true;
    updateEditorReadingTime();
    renderMarkdownPreview();
});

postEditor.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (activePostId === null) {
        return;
    }

    savePostButton.disabled = true;
    editorMessage.textContent = 'saving...';

    try {
        const response = await fetch(
            `/api/admin/posts/${activePostId}`,
            {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    title: editorTitle.value,
                    excerpt: (
                        editorExcerpt.value.trim() ||
                        null
                    ),
                    content_markdown: editorContent.value
                })
            }
        );

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await readResponse(response);
        const post = data.post;

        editorTitle.value = post.title;
        editorExcerpt.value = post.excerpt || '';
        editorContent.value = post.content_markdown;
        renderMarkdownPreview();

        updateEditorStatus(post);

        editorReadingTime.textContent =
            `${post.reading_minutes} min read`;

        editorIsDirty = false;
        editorMessage.textContent = 'saved';
    } catch (error) {
        editorMessage.textContent = error.message;

        console.error(
            'Post saving failed:',
            error
        );
    } finally {
        savePostButton.disabled = false;
    }
});

publishButton.addEventListener('click', async () => {
    if (activePostId === null) {
        return;
    }

    if (editorIsDirty) {
        editorMessage.textContent =
            'save your changes before publishing';

        return;
    }

    const isPublished =
        activePostStatus === 'published';

    const action = (
        isPublished
            ? 'unpublish'
            : 'publish'
    );

    const confirmed = window.confirm(
        isPublished
            ? 'unpublish this post?'
            : 'publish this post publicly?'
    );

    if (!confirmed) {
        return;
    }

    publishButton.disabled = true;
    savePostButton.disabled = true;

    editorMessage.textContent = (
        isPublished
            ? 'unpublishing...'
            : 'publishing...'
    );

    try {
        const response = await fetch(
            `/api/admin/posts/${activePostId}/${action}`,
            {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            }
        );

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await readResponse(response);
        const post = data.post;

        updateEditorStatus(post);

        editorMessage.textContent = (
            post.status === 'published'
                ? 'published'
                : 'returned to drafts'
        );
    } catch (error) {
        editorMessage.textContent = error.message;

        console.error(
            'Post publication failed:',
            error
        );
    } finally {
        publishButton.disabled = false;
        savePostButton.disabled = false;
    }
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    setMessage(sessionMessage, 'signing out...');

    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });

        await readResponse(response);

        showLogin();
        setMessage(authMessage, 'signed out');
        passwordInput.focus();
    } catch (error) {
        setMessage(
            sessionMessage,
            error.message,
            'error'
        );
    } finally {
        logoutButton.disabled = false;
    }
});

window.addEventListener('beforeunload', (event) => {
    if (!editorIsDirty) {
        return;
    }

    event.preventDefault();
    event.returnValue = '';
});

checkSession();