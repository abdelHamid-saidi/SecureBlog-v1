const loginView = document.querySelector('#login-view');
const registerView = document.querySelector('#register-view');
const appView = document.querySelector('#app-view');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginError = document.querySelector('#login-error');
const registerError = document.querySelector('#register-error');
const welcomeEmail = document.querySelector('#welcome-email');
const logoutButton = document.querySelector('#logout');
const postForm = document.querySelector('#post-form');
const postError = document.querySelector('#post-error');
const articlesEl = document.querySelector('#articles');

function showError(el, message) {
  if (!message) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Une erreur est survenue.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function formatDate(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function renderPosts(posts) {
  articlesEl.replaceChildren();
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Aucun article pour le moment.';
    articlesEl.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'article';
    const title = document.createElement('h3');
    title.textContent = post.title;
    const content = document.createElement('p');
    content.textContent = post.content;
    const time = document.createElement('time');
    time.dateTime = post.createdAt;
    time.textContent = formatDate(post.createdAt);
    card.append(title, content, time);
    articlesEl.appendChild(card);
  });
}

function showOnly(view) {
  loginView.hidden = view !== loginView;
  registerView.hidden = view !== registerView;
  appView.hidden = view !== appView;
}

function showLogin() {
  showError(loginError, '');
  showOnly(loginView);
}

function showRegister() {
  showError(registerError, '');
  showOnly(registerView);
}

async function showApp(email) {
  welcomeEmail.textContent = email;
  showOnly(appView);
  const data = await api('/api/posts');
  renderPosts(data.posts);
}

async function submitAuth(form, errorEl, path) {
  showError(errorEl, '');
  const formData = new FormData(form);
  const payload = {
    email: String(formData.get('email') || ''),
    password: String(formData.get('password') || ''),
  };
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const user = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    await showApp(user.email);
  } catch (err) {
    showError(errorEl, err.message);
  } finally {
    submit.disabled = false;
  }
}

document.querySelector('#show-register').addEventListener('click', showRegister);
document.querySelector('#show-login').addEventListener('click', showLogin);

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth(loginForm, loginError, '/api/login');
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth(registerForm, registerError, '/api/register');
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await api('/api/logout', { method: 'POST', body: '{}' });
    postForm.reset();
    showError(postError, '');
    showLogin();
  } catch (err) {
    showError(postError, err.message);
  } finally {
    logoutButton.disabled = false;
  }
});

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError(postError, '');
  const formData = new FormData(postForm);
  const payload = {
    title: String(formData.get('title') || ''),
    content: String(formData.get('content') || ''),
  };
  const submit = postForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    await api('/api/posts', { method: 'POST', body: JSON.stringify(payload) });
    postForm.reset();
    const data = await api('/api/posts');
    renderPosts(data.posts);
  } catch (err) {
    showError(postError, err.message);
  } finally {
    submit.disabled = false;
  }
});

async function restoreSession() {
  try {
    const me = await api('/api/me');
    await showApp(me.email);
  } catch (err) {
    if (err.status !== 401) showError(loginError, err.message);
    showLogin();
  }
}

restoreSession();
