const BACKEND_URL = 'http://localhost:5000';

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if (!token) {
  window.location.href = 'index.html';
}

document.getElementById('welcomeUser').textContent = `Welcome, ${username}!`;

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
});
document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'role.html';
});

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadMsg = document.getElementById('uploadMsg');
const filesList = document.getElementById('filesList');
const shareResult = document.getElementById('shareResult');

// Upload file with secret code, expiry, and download limit
uploadBtn.addEventListener('click', async () => {
  uploadMsg.textContent = '';
  uploadMsg.style.color = '#ff6b6b';
  shareResult.style.display = 'none';

  const file = fileInput.files[0];
  const secretCode = document.getElementById('secretCode').value.trim();
  const expiryMinutes = document.getElementById('expirySelect').value;
  const maxDownloads = document.getElementById('maxDownloads').value;

  if (!file) {
    uploadMsg.textContent = 'Please choose a file first';
    return;
  }
  if (!secretCode) {
    uploadMsg.textContent = 'Please set a secret code for the receiver';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('secretCode', secretCode);
  formData.append('expiryMinutes', expiryMinutes);
  formData.append('maxDownloads', maxDownloads);

  try {
    const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      uploadMsg.textContent = data.error || 'Upload failed';
      return;
    }

    uploadMsg.style.color = '#4ade80';
    uploadMsg.textContent = 'File uploaded and encrypted successfully!';

    const shareLink = window.location.href.replace('dashboard.html', `share.html?id=${data.file.id}`);

    shareResult.style.display = 'block';
    shareResult.innerHTML = `
      <strong>Send these two things to the receiver separately:</strong><br><br>
      🔗 Link: ${shareLink}<br>
      🔑 Secret Code: ${secretCode}
    `;

    fileInput.value = '';
    document.getElementById('secretCode').value = '';
    document.getElementById('maxDownloads').value = '';

    loadFiles();
  } catch (err) {
    uploadMsg.textContent = 'Could not connect to server';
  }
});

// Load and display files with status
async function loadFiles() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/files/list`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      filesList.innerHTML = `<p class="empty-msg">${data.error}</p>`;
      return;
    }

    if (data.files.length === 0) {
      filesList.innerHTML = '<p class="empty-msg">No files uploaded yet.</p>';
      return;
    }

    filesList.innerHTML = data.files.map(f => {
      const statusBadge = f.opened
        ? `<span class="status-badge status-opened">✅ Opened on ${new Date(f.openedAt).toLocaleString()}</span>`
        : `<span class="status-badge status-notopened">⏳ Not opened yet</span>`;

      const expiryText = f.expiresAt
        ? `Expires: ${new Date(f.expiresAt).toLocaleString()}`
        : 'Never expires';

      const downloadsText = f.maxDownloads
        ? `Downloads: ${f.downloadCount}/${f.maxDownloads}`
        : `Downloads: ${f.downloadCount} (unlimited)`;

      return `
        <div class="file-item" style="flex-direction: column; align-items: flex-start;">
          <div style="width:100%; display:flex; justify-content: space-between;">
            <div>
              <div class="file-name">${f.originalName}</div>
              <div class="file-meta">${(f.size / 1024).toFixed(1)} KB • ${new Date(f.uploadedAt).toLocaleString()}</div>
              <div class="file-meta">${expiryText} • ${downloadsText}</div>
            </div>
            <button class="download-btn" onclick="downloadFile('${f.id}', '${f.originalName}')">⬇ My Copy</button>
          </div>
          <div style="margin-top:8px;">${statusBadge}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    filesList.innerHTML = '<p class="empty-msg">Could not load files</p>';
  }
}

// Sender downloading their own file directly (no code needed, they're logged in)
async function downloadFile(id, name) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/files/download/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      alert('Download failed');
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Could not connect to server');
  }
}

loadFiles();