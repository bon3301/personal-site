const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('admin-password');
const loginButton = document.getElementById('login-button');
const authMessage = document.getElementById('auth-message');

const adminSession = document.getElementById('admin-session');
const logoutButton = document.getElementById('logout-button');
const sessionMessage = document.getElementById('session-message');

let csrfToken = null;

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
}

function showAdmin(token) {
    csrfToken = token;
    loginForm.hidden = true;
    adminSession.hidden = false;
    setMessage(sessionMessage, '');
}

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
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

checkSession();