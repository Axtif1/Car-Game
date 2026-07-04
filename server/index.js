import http from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { dbManager } from './database/db.js';
import { socketAuthMiddleware, generateToken } from './auth/auth.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';
import bcrypt from 'bcryptjs';
import { sendBrevoWelcomeEmail, sendBrevoOTPEmail } from './services/brevo.js';

const pendingSignups = new Map();

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Health status API endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: Date.now(),
    dbConnected: dbManager.isConnected
  });
});

// Authentication Endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide Name, Email, and Password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await dbManager.getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    pendingSignups.set(cleanEmail, {
      name: name.trim(),
      email: cleanEmail,
      password,
      avatar: avatar || '/avatars/avatar1.png',
      otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send OTP Verification Email via Brevo
    sendBrevoOTPEmail(cleanEmail, name.trim(), otpCode).catch(e => console.error('Brevo OTP error:', e));

    res.json({ success: true, requireOtp: true, email: cleanEmail, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Please provide both Email and verification code.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pending = pendingSignups.get(cleanEmail);

    if (!pending) {
      return res.status(400).json({ success: false, message: 'No registration pending for this email or session expired.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(cleanEmail);
      return res.status(400).json({ success: false, message: 'Verification code expired. Please sign up again.' });
    }

    if (pending.otpCode !== otpCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pending.password, salt);

    const user = await dbManager.createUserAuth({
      name: pending.name,
      email: pending.email,
      password: hashedPassword,
      avatar: pending.avatar || '/avatars/avatar1.png'
    });

    pendingSignups.delete(cleanEmail);

    // Send Welcome Email asynchronously
    sendBrevoWelcomeEmail(pending.email, pending.name).catch(e => console.error('Brevo welcome error:', e));

    const token = generateToken(user);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('OTP Verify error:', err);
    res.status(500).json({ success: false, message: 'Server error verifying code.' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both Email and Password.' });
    }

    const user = await dbManager.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({ success: true, token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Connect database
dbManager.connect();

// Attach authentication middleware
io.use(socketAuthMiddleware);

// Handle connections
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
});

// Serve built frontend static files in production
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🏁 [Server] NitroRush Authoritative 3D Racing Server running on port ${PORT}`);
});
