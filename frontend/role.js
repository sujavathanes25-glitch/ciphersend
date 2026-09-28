const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if (!token) {
  window.location.href = 'index.html';
}

document.getElementById('roleUsername').textContent = username;

document.getElementById('sendCard').addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

document.getElementById('receiveCard').addEventListener('click', () => {
  window.location.href = 'receive.html';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
});