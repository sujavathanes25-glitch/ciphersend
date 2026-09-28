const BACKEND_URL = 'http://localhost:5000';

const params = new URLSearchParams(window.location.search);
const fileId = params.get('id');

const fileNameDisplay = document.getElementById('fileNameDisplay');
const accessBox = document.getElementById('accessBox');
const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');
const unlockBtn = document.getElementById('unlockBtn');
const codeInput = document.getElementById('codeInput');
const accessMsg = document.getElementById('accessMsg');

async function checkFileInfo() {
  if (!fileId) {
    showError('No file link provided');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/files/info/${fileId}`);
    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'This link is invalid');
      return;
    }

    if (data.expired) {
      showError('⏰ This link has expired. Ask the sender to share the file again.');
      return;
    }

    if (data.limitReached) {
      showError('🚫 This file has already reached its download limit.');
      return;
    }

    fileNameDisplay.textContent = `File: ${data.originalName}`;
    accessBox.style.display = 'block';
  } catch (err) {
    showError('Could not connect to server');
  }
}

function showError(msg) {
  fileNameDisplay.textContent = '';
  errorBox.style.display = 'block';
  errorText.textContent = msg;
}

unlockBtn.addEventListener('click', async () => {
  accessMsg.textContent = '';
  const code = codeInput.value.trim();

  if (!code) {
    accessMsg.textContent = 'Please enter the secret code';
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
      accessMsg.textContent = data.error || 'Could not unlock file';
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

    accessMsg.style.color = '#4ade80';
    accessMsg.textContent = 'File unlocked and downloaded successfully!';
  } catch (err) {
    accessMsg.textContent = 'Could not connect to server';
  }
});

checkFileInfo();