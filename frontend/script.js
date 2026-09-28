const BACKEND_URL = 'http://localhost:5000';

// Login elements
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

// Register elements
const registerForm = document.getElementById('registerForm');
const registerMsg = document.getElementById('registerMsg');
const toggleRegPassword = document.getElementById('toggleRegPassword');
const regPasswordInput = document.getElementById('regPassword');

// View switch elements
const loginView = document.getElementById('loginView');
const registerView = document.getElementById('registerView');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

// Switch to register view
showRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginView.style.display = 'none';
  registerView.style.display = 'block';
});

// Switch back to login view
showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerView.style.display = 'none';
  loginView.style.display = 'block';
});

// Show/hide password - login
togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.textContent = isPassword ? '🙈' : '👁️';
});

// Show/hide password - register
toggleRegPassword.addEventListener('click', () => {
  const isPassword = regPasswordInput.type === 'password';
  regPasswordInput.type = isPassword ? 'text' : 'password';
  toggleRegPassword.textContent = isPassword ? '🙈' : '👁️';
});

// Handle REGISTER form submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerMsg.textContent = '';
  registerMsg.style.color = '#ff6b6b';

  const username = document.getElementById('regUsername').value.trim();
  const password = regPasswordInput.value;

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      registerMsg.textContent = data.error || 'Registration failed';
      return;
    }

    // Success message, stays on screen, no popup
    registerMsg.style.color = '#4ade80';
    registerMsg.textContent = `Account created! Remember your username: "${username}" — switching to login...`;

    // Auto switch to login view after a short delay
    setTimeout(() => {
      registerForm.reset();
      registerMsg.textContent = '';
      registerView.style.display = 'none';
      loginView.style.display = 'block';
      document.getElementById('username').value = username; // pre-fill for convenience
    }, 2000);

  } catch (err) {
    registerMsg.textContent = 'Could not connect to server. Is the backend running?';
  }
});

// Handle LOGIN form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorMsg.textContent = data.error || 'Login failed';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);

   
    window.location.href = 'role.html';
  } catch (err) {
    errorMsg.textContent = 'Could not connect to server. Is the backend running?';
  }
});
// Forgot password elements
const forgotView = document.getElementById('forgotView');
const forgotForm = document.getElementById('forgotForm');
const forgotMsg = document.getElementById('forgotMsg');
const showForgot = document.getElementById('showForgot');
const showLoginFromForgot = document.getElementById('showLoginFromForgot');
const toggleNewPassword = document.getElementById('toggleNewPassword');
const newPasswordInput = document.getElementById('newPassword');

// Switch to forgot password view
showForgot.addEventListener('click', (e) => {
  e.preventDefault();
  loginView.style.display = 'none';
  forgotView.style.display = 'block';
});

// Switch back to login view from forgot password
showLoginFromForgot.addEventListener('click', (e) => {
  e.preventDefault();
  forgotView.style.display = 'none';
  loginView.style.display = 'block';
});

// Show/hide new password field
toggleNewPassword.addEventListener('click', () => {
  const isPassword = newPasswordInput.type === 'password';
  newPasswordInput.type = isPassword ? 'text' : 'password';
  toggleNewPassword.textContent = isPassword ? '🙈' : '👁️';
});

// Handle forgot password form submit
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotMsg.textContent = '';
  forgotMsg.style.color = '#ff6b6b';

  const username = document.getElementById('forgotUsername').value.trim();
  const newPassword = newPasswordInput.value;

  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword }),
    });
    const data = await response.json();

    if (!response.ok) {
      forgotMsg.textContent = data.error || 'Reset failed';
      return;
    }

    forgotMsg.style.color = '#4ade80';
    forgotMsg.textContent = 'Password reset! Switching to login...';

    setTimeout(() => {
      forgotForm.reset();
      forgotMsg.textContent = '';
      forgotView.style.display = 'none';
      loginView.style.display = 'block';
      document.getElementById('username').value = username;
    }, 2000);

  } catch (err) {
    forgotMsg.textContent = 'Could not connect to server. Is the backend running?';
  }
});