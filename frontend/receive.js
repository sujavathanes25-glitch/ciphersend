const BACKEND_URL = 'http://localhost:5000';

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if (!token) {
  window.location.href = 'index.html';
}

document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'role.html';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
});

const unlockBtn = document.getElementById('unlockBtn');
const receiveMsg = document.getElementById('receiveMsg');

unlockBtn.addEventListener('click', async () => {
  receiveMsg.textContent = '';
  receiveMsg.style.color = '#ff6b6b';

  const fileId = document.getElementById('fileIdInput').value.trim();
  const code = document.getElementById('secretCodeInput').value.trim();

  if (!fileId || !code) {
    receiveMsg.textContent = 'Please enter both File ID and secret code';
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/files/access/${fileId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const data = await response.json();
      receiveMsg.textContent = data.error || 'Could not unlock file';
      return;
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'downloaded_file';
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/"/g, '');
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    receiveMsg.style.color = '#4ade80';
    receiveMsg.textContent = 'File unlocked and downloaded successfully!';
  } catch (err) {
    receiveMsg.textContent = 'Could not connect to server';
  }
});