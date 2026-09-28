const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'ciphersend_secret_key_123';
const USERS_FILE = path.join(__dirname, 'users.json');
const FILES_DB = path.join(__dirname, 'files.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ENCRYPTION_KEY = crypto.createHash('sha256').update('ciphersend_encryption_key').digest(); // 32 bytes for AES-256

app.use(cors());
app.use(express.json());

// Helper functions to read/write users.json
function getUsers() {
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
// Helper functions for files.json
function getFiles() {
  const data = fs.readFileSync(FILES_DB, 'utf-8');
  return JSON.parse(data);
}

function saveFiles(files) {
  fs.writeFileSync(FILES_DB, JSON.stringify(files, null, 2));
}

// Middleware to check login token before allowing file actions
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided, please log in' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired, please log in again' });
    }
    req.user = decoded;
    next();
  });
}

// Encrypt a file buffer using AES-256
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { encrypted, iv: iv.toString('hex') };
}

// Decrypt a file buffer using AES-256
function decryptBuffer(encryptedBuffer, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

// Multer setup - temporarily holds file in memory before we encrypt it ourselves
const upload = multer({ storage: multer.memoryStorage() });

// Test route - visit this in browser to check server is alive
app.get('/', (req, res) => {
  res.send('CipherSend backend is running ✅');
});

// REGISTER route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = getUsers();
    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    saveUsers(users);

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// LOGIN route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ message: 'Login successful', token, username: user.username });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// UPLOAD route (protected - must be logged in)
app.post('/api/files/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file selected' });
    }

    const { secretCode, expiryMinutes, maxDownloads } = req.body;

    if (!secretCode) {
      return res.status(400).json({ error: 'A secret code is required' });
    }

    const { encrypted, iv } = encryptBuffer(req.file.buffer);
    const storedName = `${Date.now()}_${req.file.originalname}.enc`;
    fs.writeFileSync(path.join(UPLOADS_DIR, storedName), encrypted);

    const secretCodeHash = await bcrypt.hash(secretCode, 10);

    let expiresAt = null;
    if (expiryMinutes && Number(expiryMinutes) > 0) {
      expiresAt = new Date(Date.now() + Number(expiryMinutes) * 60000).toISOString();
    }

    const files = getFiles();
    const newFile = {
      id: Date.now().toString(),
      owner: req.user.username,
      originalName: req.file.originalname,
      storedName,
      iv,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      secretCodeHash,
      expiresAt,
      maxDownloads: maxDownloads ? Number(maxDownloads) : null,
      downloadCount: 0,
      opened: false,
      openedAt: null,
    };
    files.push(newFile);
    saveFiles(files);

    res.status(201).json({ message: 'File uploaded and encrypted successfully', file: newFile });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
// LIST files belonging to the logged-in user
// LIST files belonging to the logged-in user (sender's own dashboard)
app.get('/api/files/list', verifyToken, (req, res) => {
  const files = getFiles();
  const myFiles = files
    .filter(f => f.owner === req.user.username)
    .map(f => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      uploadedAt: f.uploadedAt,
      expiresAt: f.expiresAt,
      maxDownloads: f.maxDownloads,
      downloadCount: f.downloadCount,
      opened: f.opened,
      openedAt: f.openedAt,
    }));
  res.status(200).json({ files: myFiles });
});
// INFO route - lets the receiver's page check basic info before entering the code
app.get('/api/files/info/:id', (req, res) => {
  const files = getFiles();
  const file = files.find(f => f.id === req.params.id);

  if (!file) {
    return res.status(404).json({ error: 'This link is invalid or the file was removed' });
  }

  const expired = file.expiresAt && new Date() > new Date(file.expiresAt);
  const limitReached = file.maxDownloads && file.downloadCount >= file.maxDownloads;

  res.status(200).json({
    originalName: file.originalName,
    expired: !!expired,
    limitReached: !!limitReached,
  });
});

// ACCESS route - receiver submits the secret code to unlock and download
app.post('/api/files/access/:id', async (req, res) => {
  try {
    const { code } = req.body;
    const files = getFiles();
    const file = files.find(f => f.id === req.params.id);

    if (!file) {
      return res.status(404).json({ error: 'This link is invalid or the file was removed' });
    }

    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      return res.status(410).json({ error: 'This link has expired' });
    }

    if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
      return res.status(403).json({ error: 'The download limit for this file has been reached' });
    }

    const codeMatches = await bcrypt.compare(code || '', file.secretCodeHash);
    if (!codeMatches) {
      return res.status(401).json({ error: 'Incorrect secret code' });
    }

    file.downloadCount += 1;
    if (!file.opened) {
      file.opened = true;
      file.openedAt = new Date().toISOString();
    }
    saveFiles(files);

    const encryptedBuffer = fs.readFileSync(path.join(UPLOADS_DIR, file.storedName));
    const decryptedBuffer = decryptBuffer(encryptedBuffer, file.iv);

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.send(decryptedBuffer);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// DOWNLOAD a file (decrypts it on the fly)
app.get('/api/files/download/:id', verifyToken, (req, res) => {
  try {
    const files = getFiles();
    const file = files.find(f => f.id === req.params.id && f.owner === req.user.username);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const encryptedBuffer = fs.readFileSync(path.join(UPLOADS_DIR, file.storedName));
    const decryptedBuffer = decryptBuffer(encryptedBuffer, file.iv);

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.send(decryptedBuffer);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
// RESET PASSWORD route
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ error: 'No account found with that username' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    saveUsers(users);

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});