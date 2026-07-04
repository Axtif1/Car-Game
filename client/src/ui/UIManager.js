import { SOCKET_EVENTS } from '../../../shared/events.js';
import { networkManager } from '../networking/NetworkManager.js';
import { soundManager } from '../sounds/SoundManager.js';
import { TRACK_CHECKPOINTS } from '../../../shared/constants.js';

/**
 * Glassmorphism UI Manager
 */
export class UIManager {
  constructor(app) {
    this.app = app;
    this.screens = {
      loading: document.getElementById('screen-loading'),
      menu: document.getElementById('screen-menu'),
      lobby: document.getElementById('screen-lobby'),
      room: document.getElementById('screen-room'),
      garage: document.getElementById('screen-garage'),
      hud: document.getElementById('screen-hud'),
      results: document.getElementById('screen-results'),
      settings: document.getElementById('screen-settings'),
      modeSetup: document.getElementById('screen-mode-setup'),
      auth: document.getElementById('screen-auth')
    };

    this.minimapCtx = document.getElementById('minimap-canvas')?.getContext('2d');
    this.currentScreen = 'loading';
    this.selectedCarType = 'sports';
    this.selectedSetupLaps = 3;
    this.selectedSetupTrack = 'city';
    this.setupModeType = 'quick';

    this.bindEvents();
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      const el = this.screens[key];
      if (!el) return;
      if (key === screenName) {
        el.classList.remove('hidden');
        el.classList.add('active');
      } else {
        el.classList.remove('active');
        el.classList.add('hidden');
      }
    });
    this.currentScreen = screenName;

    if (screenName !== 'hud') {
      soundManager.muteEngine();
    }

    if (this.app) {
      if (screenName === 'garage') {
        if (this.app.camera) this.app.camera.mode = 'garage';
        this.app.enterGarageShowroom?.();
      } else if (screenName === 'hud') {
        if (this.app.camera) this.app.camera.mode = 'race';
        this.updateSoundButtonState();
      } else {
        this.app.resetCarToMenu?.();
      }
    }

    soundManager.playUIClick();
  }

  openModeSetup(type = 'quick') {
    this.setupModeType = type;
    const titleEl = document.getElementById('setup-mode-title');
    const descEl = document.getElementById('setup-mode-desc');
    if (type === 'quick') {
      if (titleEl) titleEl.textContent = '🚀 QUICK RACE SETUP';
      if (descEl) descEl.textContent = 'Fast-paced sprint race against 3 AI opponents.';
    } else {
      if (titleEl) titleEl.textContent = '🏆 SINGLE PLAYER CHAMPIONSHIP';
      if (descEl) descEl.textContent = 'Intense championship circuit against 7 AI opponents.';
    }
    document.querySelectorAll('.btn-lap-tab').forEach(b => {
      if (Number(b.getAttribute('data-laps')) === this.selectedSetupLaps) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    document.querySelectorAll('.btn-track-card').forEach(b => {
      if (b.getAttribute('data-track') === this.selectedSetupTrack) {
        b.classList.add('active');
        b.style.borderColor = '#00ffff';
        b.style.background = 'rgba(0,255,255,0.2)';
      } else {
        b.classList.remove('active');
        b.style.borderColor = 'rgba(255,255,255,0.2)';
        b.style.background = 'rgba(0,0,0,0.4)';
      }
    });
    this.showScreen('modeSetup');
  }

  updateLoadingProgress(percent, text) {
    const bar = document.getElementById('loading-progress');
    const label = document.getElementById('loading-status');
    if (bar) bar.style.width = `${percent}%`;
    if (label && text) label.textContent = text;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (['garage', 'lobby', 'settings', 'results', 'modeSetup'].includes(this.currentScreen)) {
          this.showScreen('menu');
        }
      }
      if (e.code === 'KeyM') {
        if (this.currentScreen === 'hud') {
          soundManager.toggleMute();
          this.updateSoundButtonState();
        }
      }
    });

    // Setup Modal Lap Tabs
    document.querySelectorAll('.btn-lap-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-lap-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSetupLaps = Number(btn.getAttribute('data-laps')) || 3;
      });
    });

    document.querySelectorAll('.btn-track-card').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-track-card').forEach(b => {
          b.classList.remove('active');
          b.style.borderColor = 'rgba(255,255,255,0.2)';
          b.style.background = 'rgba(0,0,0,0.4)';
        });
        btn.classList.add('active');
        btn.style.borderColor = '#00ffff';
        btn.style.background = 'rgba(0,255,255,0.2)';
        this.selectedSetupTrack = btn.getAttribute('data-track') || 'city';
      });
    });

    document.getElementById('btn-setup-back')?.addEventListener('click', () => {
      this.showScreen('menu');
    });

    document.getElementById('btn-setup-start')?.addEventListener('click', () => {
      if (this.setupModeType === 'quick') {
        networkManager.socket.emit(SOCKET_EVENTS.CREATE_ROOM, { name: 'Quick City Sprint', isPrivate: true, addBots: 3, totalLaps: this.selectedSetupLaps, trackId: this.selectedSetupTrack });
      } else {
        networkManager.socket.emit(SOCKET_EVENTS.CREATE_ROOM, { name: 'Single Player Championship', isPrivate: true, addBots: 7, totalLaps: this.selectedSetupLaps, trackId: this.selectedSetupTrack });
      }
    });

    // Menu Buttons
    document.getElementById('btn-quick-race')?.addEventListener('click', () => {
      this.openModeSetup('quick');
    });

    document.getElementById('btn-single-player')?.addEventListener('click', () => {
      this.openModeSetup('single');
    });

    document.getElementById('btn-multiplayer')?.addEventListener('click', () => {
      this.showScreen('lobby');
      networkManager.socket.emit(SOCKET_EVENTS.GET_ROOMS);
    });

    document.getElementById('btn-garage')?.addEventListener('click', () => {
      this.showScreen('garage');
    });

    document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
      if (this.app?.camera) {
        this.app.camera.resetGarageOrbit?.();
      }
    });

    document.getElementById('btn-exit-race')?.addEventListener('click', () => {
      networkManager.socket.emit(SOCKET_EVENTS.LEAVE_ROOM);
      this.showScreen('menu');
    });

    document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
      soundManager.toggleMute();
      this.updateSoundButtonState();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showScreen('settings');
    });

    // Lobby Navigation
    document.getElementById('btn-lobby-back')?.addEventListener('click', () => this.showScreen('menu'));
    document.getElementById('btn-refresh-lobbies')?.addEventListener('click', () => {
      networkManager.socket.emit(SOCKET_EVENTS.GET_ROOMS);
    });
    document.getElementById('btn-quick-join')?.addEventListener('click', () => {
      const container = document.getElementById('rooms-list-container');
      const joinBtn = container?.querySelector('.btn-join-room');
      if (joinBtn) {
        joinBtn.click();
      } else {
        networkManager.socket.emit(SOCKET_EVENTS.CREATE_ROOM, { name: 'Quick Match', isPrivate: false, totalLaps: 3, trackId: 'city' });
      }
    });
    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      const nameInput = document.getElementById('input-room-name');
      const name = nameInput?.value || 'Public Grand Prix';
      const totalLaps = Math.min(5, Math.max(1, Number(document.getElementById('select-lobby-laps')?.value) || 3));
      const trackId = document.getElementById('select-lobby-track')?.value || 'city';
      networkManager.socket.emit(SOCKET_EVENTS.CREATE_ROOM, { name, isPrivate: false, totalLaps, trackId });
    });

    document.getElementById('btn-join-by-code')?.addEventListener('click', () => {
      const codeInput = document.getElementById('input-room-code');
      const code = codeInput?.value?.trim();
      if (code) {
        networkManager.socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: code });
      } else {
        alert('Please enter a valid 5-digit Room Code!');
      }
    });

    document.getElementById('room-code-display')?.addEventListener('click', () => {
      const code = document.getElementById('room-code-val')?.textContent;
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code);
        const originalText = document.getElementById('room-code-val').textContent;
        document.getElementById('room-code-val').textContent = 'COPIED!';
        setTimeout(() => {
          if (document.getElementById('room-code-val')) document.getElementById('room-code-val').textContent = originalText;
        }, 1500);
      }
    });

    // Room Controls
    document.getElementById('btn-room-leave')?.addEventListener('click', () => {
      networkManager.socket.emit(SOCKET_EVENTS.LEAVE_ROOM);
      this.showScreen('lobby');
    });

    document.getElementById('btn-room-ready')?.addEventListener('click', (e) => {
      soundManager.playClick();
      const currentlyReady = e.target.textContent.includes('CHECKED');
      const newReady = !currentlyReady;
      networkManager.socket.emit(SOCKET_EVENTS.PLAYER_READY, { isReady: newReady });
    });

    document.getElementById('btn-room-start')?.addEventListener('click', () => {
      soundManager.playClick();
      networkManager.socket.emit(SOCKET_EVENTS.HOST_START_RACE);
    });

    document.getElementById('btn-room-add-bot')?.addEventListener('click', () => {
      soundManager.playClick();
      networkManager.socket.emit(SOCKET_EVENTS.ADD_AI_BOTS);
    });

    document.getElementById('btn-room-remove-bot')?.addEventListener('click', () => {
      soundManager.playClick();
      networkManager.socket.emit(SOCKET_EVENTS.REMOVE_AI_BOTS);
    });

    document.querySelectorAll('.btn-room-car').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-room-car').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(0,255,255,0.2)';
        btn.style.borderColor = '#00ffff';
        const carCategory = btn.getAttribute('data-car') || 'sports';
        networkManager.socket.emit(SOCKET_EVENTS.CHANGE_CAR_CATEGORY, { carCategory });
      });
    });

    // Garage Customization
    const getCustomizationData = () => ({
      carType: this.selectedCarType,
      bodyColor: document.getElementById('picker-body-color')?.value || '#ff2a2a',
      rimColor: document.getElementById('picker-rim-color')?.value || '#dcdcdc',
      neonColor: document.getElementById('picker-neon-color')?.value || '#00ffff'
    });

    document.querySelectorAll('.car-selector-buttons .btn-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.car-selector-buttons .btn-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCarType = btn.getAttribute('data-car') || 'sports';
        this.updateGaragePreviewSpecs();
        if (this.app?.playerCar) {
          this.app.rebuildLocalCar(this.selectedCarType, getCustomizationData());
        }
      });
    });

    ['picker-body-color', 'picker-rim-color', 'picker-neon-color'].forEach(pickerId => {
      document.getElementById(pickerId)?.addEventListener('input', () => {
        if (this.app?.playerCar) {
          this.app.rebuildLocalCar(this.selectedCarType, getCustomizationData());
        }
      });
    });

    document.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const color = btn.getAttribute('data-color');
        const inputEl = document.getElementById(targetId);
        if (inputEl && color) {
          inputEl.value = color;
          if (this.app?.playerCar) {
            this.app.rebuildLocalCar(this.selectedCarType, getCustomizationData());
          }
        }
      });
    });

    document.getElementById('btn-save-garage')?.addEventListener('click', () => {
      const garageData = getCustomizationData();
      networkManager.socket.emit(SOCKET_EVENTS.SAVE_GARAGE, garageData);
      if (this.app) {
        this.app.rebuildLocalCar(this.selectedCarType, garageData);
      }
      this.showScreen('menu');
    });

    document.getElementById('btn-garage-back')?.addEventListener('click', () => this.showScreen('menu'));

    // Results back button
    document.getElementById('btn-results-menu')?.addEventListener('click', () => {
      networkManager.socket.emit(SOCKET_EVENTS.LEAVE_ROOM);
      this.showScreen('menu');
    });

    // Settings
    document.getElementById('btn-settings-save')?.addEventListener('click', () => {
      const graphics = document.getElementById('select-graphics')?.value || 'high';
      const vol = document.getElementById('range-volume')?.value || 75;
      soundManager.setVolume(Number(vol));
      if (this.app.postProcessor) this.app.postProcessor.setQuality(graphics);
      this.showScreen('menu');
    });

    this.setupAuthListeners();
  }

  setupAuthListeners() {
    const apiBase = window.location.hostname === 'localhost' && window.location.port === '5173' ? 'http://localhost:3000' : '';
    const tabLogin = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const formAvatarSelect = document.getElementById('form-avatar-select');
    const formOtp = document.getElementById('form-otp');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const avatarError = document.getElementById('avatar-error');
    const otpError = document.getElementById('otp-error');
    let pendingOtpEmail = '';

    tabLogin?.addEventListener('click', () => {
      tabLogin.classList.replace('btn-secondary', 'btn-primary');
      tabLogin.style.opacity = '1';
      tabSignup?.classList.replace('btn-primary', 'btn-secondary');
      if (tabSignup) tabSignup.style.opacity = '0.7';
      if (formLogin) formLogin.style.display = 'flex';
      if (formSignup) formSignup.style.display = 'none';
      if (formAvatarSelect) formAvatarSelect.style.display = 'none';
      if (formOtp) formOtp.style.display = 'none';
      if (loginError) loginError.style.display = 'none';
      const authTabs = document.getElementById('auth-tabs-container');
      if (authTabs) authTabs.style.display = 'flex';
    });

    tabSignup?.addEventListener('click', () => {
      tabSignup.classList.replace('btn-secondary', 'btn-primary');
      tabSignup.style.opacity = '1';
      tabLogin?.classList.replace('btn-primary', 'btn-secondary');
      if (tabLogin) tabLogin.style.opacity = '0.7';
      if (formSignup) formSignup.style.display = 'flex';
      if (formLogin) formLogin.style.display = 'none';
      if (formAvatarSelect) formAvatarSelect.style.display = 'none';
      if (formOtp) formOtp.style.display = 'none';
      if (signupError) signupError.style.display = 'none';
      const authTabs = document.getElementById('auth-tabs-container');
      if (authTabs) authTabs.style.display = 'flex';
    });

    document.querySelectorAll('.avatar-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.avatar-card').forEach(o => o.classList.remove('active'));
        card.classList.add('active');
        const av = card.getAttribute('data-avatar');
        const hiddenEl = document.getElementById('signup-avatar');
        if (hiddenEl && av) hiddenEl.value = av;
      });
    });

    document.getElementById('btn-back-to-signup')?.addEventListener('click', () => {
      if (formAvatarSelect) formAvatarSelect.style.display = 'none';
      if (formSignup) formSignup.style.display = 'flex';
      if (avatarError) avatarError.style.display = 'none';
      const authTabs = document.getElementById('auth-tabs-container');
      if (authTabs) authTabs.style.display = 'flex';
    });

    document.getElementById('btn-back-signup')?.addEventListener('click', () => {
      if (formOtp) formOtp.style.display = 'none';
      if (formAvatarSelect) formAvatarSelect.style.display = 'flex';
      if (otpError) otpError.style.display = 'none';
      const authTabs = document.getElementById('auth-tabs-container');
      if (authTabs) authTabs.style.display = 'none';
    });

    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginError) loginError.style.display = 'none';
      const email = document.getElementById('login-email')?.value;
      const password = document.getElementById('login-password')?.value;

      try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('racing_jwt_token', data.token);
          localStorage.setItem('racing_user_name', data.user.username || data.user.name);
          if (data.user.avatar) localStorage.setItem('racing_user_avatar', data.user.avatar);
          networkManager.token = data.token;
          networkManager.connect(data.user.username || data.user.name);
          this.updateProfile(data.user);
          this.showScreen('menu');
        } else {
          if (loginError) {
            loginError.textContent = data.message || 'Login failed.';
            loginError.style.display = 'block';
          }
        }
      } catch (err) {
        if (loginError) {
          loginError.textContent = 'Network error during login.';
          loginError.style.display = 'block';
        }
      }
    });

    formSignup?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (signupError) signupError.style.display = 'none';
      const name = document.getElementById('signup-name')?.value;
      const email = document.getElementById('signup-email')?.value;
      const password = document.getElementById('signup-password')?.value;
      if (!name || !email || !password) {
        if (signupError) {
          signupError.textContent = 'Please fill out Name, Email, and Password.';
          signupError.style.display = 'block';
        }
        return;
      }
      if (formSignup) formSignup.style.display = 'none';
      if (formAvatarSelect) formAvatarSelect.style.display = 'flex';
      const authTabs = document.getElementById('auth-tabs-container');
      if (authTabs) authTabs.style.display = 'none';
    });

    formAvatarSelect?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (avatarError) avatarError.style.display = 'none';
      const name = document.getElementById('signup-name')?.value;
      const email = document.getElementById('signup-email')?.value;
      const password = document.getElementById('signup-password')?.value;
      const avatar = document.getElementById('signup-avatar')?.value || '/avatars/avatar1.png';

      try {
        const res = await fetch(`${apiBase}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, avatar })
        });
        const data = await res.json();
        if (data.success && data.requireOtp) {
          pendingOtpEmail = data.email || email;
          if (formAvatarSelect) formAvatarSelect.style.display = 'none';
          if (formOtp) formOtp.style.display = 'flex';
          const authTabs = document.getElementById('auth-tabs-container');
          if (authTabs) authTabs.style.display = 'none';
          const sentInfo = document.getElementById('otp-sent-info');
          if (sentInfo) sentInfo.textContent = `A 6-digit code has been sent via Brevo to ${pendingOtpEmail}.`;
        } else if (data.success && data.token) {
          localStorage.setItem('racing_jwt_token', data.token);
          localStorage.setItem('racing_user_name', data.user.username || data.user.name);
          if (data.user.avatar) localStorage.setItem('racing_user_avatar', data.user.avatar);
          networkManager.token = data.token;
          networkManager.connect(data.user.username || data.user.name);
          this.updateProfile(data.user);
          this.showScreen('menu');
        } else {
          if (avatarError) {
            avatarError.textContent = data.message || 'Signup failed.';
            avatarError.style.display = 'block';
          }
        }
      } catch (err) {
        if (avatarError) {
          avatarError.textContent = 'Network error during signup.';
          avatarError.style.display = 'block';
        }
      }
    });

    formOtp?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (otpError) otpError.style.display = 'none';
      const otpCode = document.getElementById('otp-input')?.value;

      try {
        const res = await fetch(`${apiBase}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingOtpEmail, otpCode })
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('racing_jwt_token', data.token);
          localStorage.setItem('racing_user_name', data.user.username || data.user.name);
          if (data.user.avatar) localStorage.setItem('racing_user_avatar', data.user.avatar);
          networkManager.token = data.token;
          networkManager.connect(data.user.username || data.user.name);
          this.updateProfile(data.user);
          this.showScreen('menu');
        } else {
          if (otpError) {
            otpError.textContent = data.message || 'Verification failed.';
            otpError.style.display = 'block';
          }
        }
      } catch (err) {
        if (otpError) {
          otpError.textContent = 'Network error during code verification.';
          otpError.style.display = 'block';
        }
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      localStorage.removeItem('racing_jwt_token');
      localStorage.removeItem('racing_user_name');
      localStorage.removeItem('racing_user_avatar');
      networkManager.token = null;
      if (networkManager.socket) networkManager.socket.disconnect();
      this.showScreen('auth');
    });
  }

  updateProfile(user) {
    if (!user) return;
    const nameEl = document.getElementById('menu-username');
    const coinsEl = document.getElementById('menu-coins');
    const avatarEl = document.getElementById('menu-avatar');
    if (nameEl) nameEl.textContent = user.username;
    if (coinsEl) coinsEl.textContent = `💰 ${user.coins?.toLocaleString() || 5000} Coins`;
    if (avatarEl) {
      const avUrl = user.avatar || localStorage.getItem('racing_user_avatar') || '/avatars/avatar1.png';
      avatarEl.innerHTML = `<img src="${avUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />`;
    }

    if (user.garage) {
      this.selectedCarType = user.garage.carType || 'sports';
      if (document.getElementById('picker-body-color')) document.getElementById('picker-body-color').value = user.garage.bodyColor || '#ff2a2a';
      if (document.getElementById('picker-rim-color')) document.getElementById('picker-rim-color').value = user.garage.rimColor || '#dcdcdc';
      if (document.getElementById('picker-neon-color')) document.getElementById('picker-neon-color').value = user.garage.neonColor || '#00ffff';
    }
  }

  renderRoomList(rooms) {
    const container = document.getElementById('rooms-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (!rooms || rooms.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary); padding: 20px;">No public lobbies available. Create one to start racing!</p>';
      return;
    }

    rooms.forEach(room => {
      const trackIcons = { city: '🏙️ Cyber City', canyon: '🏜️ Neon Canyon', arctic: '❄️ Arctic Frost', volcano: '🌋 Volcano Core' };
      const trackLabel = trackIcons[room.trackId] || '🏙️ Cyber City';
      const row = document.createElement('div');
      row.className = 'room-row';
      row.innerHTML = `
        <span>🏁 <b>${room.name}</b> <br/><small style="color:#00ffff;">${trackLabel} • ${room.totalLaps || 3} Laps</small></span>
        <span style="color:${room.state === 'LOBBY' ? '#00ff88' : '#ffbd00'}; font-weight:900;">${room.state}</span>
        <span style="font-weight:bold;">👥 ${room.playersCount} / ${room.maxPlayers}</span>
        <button class="btn btn-small btn-primary btn-join-room" style="background:#00ffff; color:#000; font-weight:900;">JOIN</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        networkManager.socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: room.id });
      });
      container.appendChild(row);
    });
  }

  renderRoomPlayers(room, mySocketId) {
    this.showScreen('room');
    const header = document.getElementById('room-header-title');
    const headerInfo = document.getElementById('room-header-info');
    const list = document.getElementById('room-players-list');
    const startBtn = document.getElementById('btn-room-start');
    const hostControls = document.getElementById('room-host-controls');

    if (header) header.textContent = `🏁 ${room.name.toUpperCase()}`;
    if (headerInfo) {
      const trackIcons = { city: '🏙️ Cyber City', canyon: '🏜️ Neon Canyon', arctic: '❄️ Arctic Frost', volcano: '🌋 Volcano Core' };
      const trackName = trackIcons[room.trackId] || '🏙️ Cyber City';
      headerInfo.textContent = `🗺️ Track: ${trackName} | 🏁 Total Laps: ${room.totalLaps || 3} | 👥 Players: ${room.players?.length || 1}/8`;
    }
    const codeVal = document.getElementById('room-code-val');
    if (codeVal) codeVal.textContent = room.code || (room.id ? room.id.substring(room.id.length - 5).toUpperCase() : '8X2F9');
    if (list) list.innerHTML = '';

    const myPlayer = room.players?.find(p => p.id === mySocketId);
    const readyBtn = document.getElementById('btn-room-ready');
    if (readyBtn && myPlayer) {
      readyBtn.textContent = myPlayer.isReady ? '✅ READY (CHECKED)' : 'READY UP';
      readyBtn.style.background = myPlayer.isReady ? 'rgba(0, 255, 136, 0.4)' : '';
      readyBtn.style.borderColor = myPlayer.isReady ? '#00ff88' : '';
    }

    room.players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'glass-badge';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.margin = '8px 0';
      card.style.padding = '12px 16px';
      card.style.background = p.id === mySocketId ? 'rgba(0, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)';
      card.style.border = p.id === mySocketId ? '1px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.15)';
      
      const avUrl = p.avatar || (p.isAI ? '/avatars/avatar2.png' : '/avatars/avatar1.png');
      const hostTag = p.id === room.hostId ? '<span style="background:#ffbd00; color:#000; font-size:0.65rem; font-weight:900; padding:2px 6px; border-radius:4px; margin-left:6px;">👑 HOST</span>' : '';
      const aiTag = p.isAI ? '<span style="background:#00ffff; color:#000; font-size:0.65rem; font-weight:900; padding:2px 6px; border-radius:4px; margin-left:6px;">🤖 AI BOT</span>' : '';
      
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="${avUrl}" style="width:44px; height:44px; border-radius:10px; object-fit:cover; border:2px solid ${p.isReady ? '#00ff88' : '#ff2a2a'};" />
          <div>
            <div style="font-weight:900; color:#fff; font-size:1rem; display:flex; align-items:center;">
              ${p.username} ${hostTag} ${aiTag}
            </div>
            <div style="font-size:0.75rem; color:#a0a6be; font-weight:700; margin-top:2px;">
              🏎️ Car: <span style="color:#ffbd00; text-transform:uppercase;">${p.carCategory || 'sports'}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="background:${p.isReady ? 'rgba(0,255,136,0.2)' : 'rgba(255,42,42,0.2)'}; color:${p.isReady ? '#00ff88' : '#ff2a2a'}; border:1px solid ${p.isReady ? '#00ff88' : '#ff2a2a'}; padding:6px 14px; border-radius:8px; font-weight:900; font-size:0.85rem; letter-spacing:1px;">
            ${p.isReady ? '✅ READY' : '⏳ WAITING'}
          </span>
          ${(room.hostId === mySocketId && p.id !== mySocketId) ? `<button class="btn btn-small btn-kick" data-id="${p.id}" style="background:rgba(255,42,42,0.4); border:1px solid #ff2a2a; color:#fff; font-size:0.75rem; padding:4px 8px;" title="Kick Player">❌</button>` : ''}
        </div>
      `;
      
      const kickBtn = card.querySelector('.btn-kick');
      if (kickBtn) {
        kickBtn.addEventListener('click', () => {
          networkManager.socket.emit(SOCKET_EVENTS.KICK_PLAYER, { playerId: p.id });
        });
      }
      
      list.appendChild(card);
    });

    if (startBtn) {
      if (room.hostId === mySocketId) {
        startBtn.classList.remove('hidden');
      } else {
        startBtn.classList.add('hidden');
      }
    }

    if (hostControls) {
      if (room.hostId === mySocketId) {
        hostControls.classList.remove('hidden');
      } else {
        hostControls.classList.add('hidden');
      }
    }
  }

  updateHUD(vehicleState, raceState, fps, ping, isCountDown, count) {
    if (this.currentScreen === 'hud' && isCountDown) {
      document.getElementById('hud-countdown').textContent = count;
      document.getElementById('hud-countdown').classList.remove('hidden');
    }
    if (this.currentScreen !== 'hud' || !vehicleState) return;

    document.getElementById('hud-speed-val').textContent = Math.min(120, Math.abs(vehicleState.speed || 0));
    document.getElementById('hud-gear-val').textContent = vehicleState.gear;
    document.getElementById('hud-fps').textContent = Math.round(fps);
    document.getElementById('hud-ping').textContent = `${ping}ms`;

    const rpmPercent = Math.min(100, ((vehicleState.rpm - 1000) / 7000) * 100);
    document.getElementById('hud-rpm-bar').style.width = `${rpmPercent}%`;
    const rpmTxt = document.getElementById('hud-rpm-txt');
    if (rpmTxt) rpmTxt.textContent = `${Math.round(vehicleState.rpm)} RPM`;
    document.getElementById('hud-nitro-bar').style.width = `${vehicleState.nitroFuel}%`;

    if (raceState) {
      document.getElementById('hud-lap-val').textContent = `${raceState.lap || 1} / ${raceState.totalLaps || 3}`;
      const posStr = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][Math.max(0, (raceState.position || 1) - 1)] || `${raceState.position}th`;
      document.getElementById('hud-pos-val').textContent = posStr;
    }

    this.drawMinimap(vehicleState);
  }

  drawMinimap(playerVehicle) {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const w = 180;
    const h = 180;
    ctx.clearRect(0, 0, w, h);

    if (!TRACK_CHECKPOINTS || TRACK_CHECKPOINTS.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    TRACK_CHECKPOINTS.forEach(cp => {
      if (cp.pos.x < minX) minX = cp.pos.x;
      if (cp.pos.x > maxX) maxX = cp.pos.x;
      if (cp.pos.z < minZ) minZ = cp.pos.z;
      if (cp.pos.z > maxZ) maxZ = cp.pos.z;
    });

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const rangeX = (maxX - minX) || 1;
    const rangeZ = (maxZ - minZ) || 1;
    const maxRange = Math.max(rangeX, rangeZ);
    const scale = 130 / maxRange;

    const toCanvasX = (wx) => w / 2 + (wx - centerX) * scale;
    const toCanvasY = (wz) => h / 2 + (wz - centerZ) * scale;

    // Draw track path
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    TRACK_CHECKPOINTS.forEach((cp, i) => {
      const x = toCanvasX(cp.pos.x);
      const y = toCanvasY(cp.pos.z);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw player dot
    if (playerVehicle && playerVehicle.position) {
      const px = toCanvasX(playerVehicle.position.x);
      const py = toCanvasY(playerVehicle.position.z);
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  renderResults(results) {
    this.showScreen('results');
    const tbody = document.getElementById('results-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    results.forEach((r, index) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      row.innerHTML = `
        <span style="font-weight:900; color:${index === 0 ? '#ffbd00' : '#fff'}">#${index + 1}</span>
        <span>${r.username}</span>
        <span>${r.bestLap ? `${r.bestLap}s` : '--'}</span>
        <span>${r.totalTime ? `${r.totalTime}s` : 'DNF'}</span>
      `;
      tbody.appendChild(row);
    });
  }

  updateGaragePreviewSpecs() {
    const specs = {
      sports: { speed: '75%', accel: '65%', handling: '80%' },
      super: { speed: '95%', accel: '90%', handling: '95%' },
      muscle: { speed: '80%', accel: '85%', handling: '60%' }
    }[this.selectedCarType] || { speed: '75%', accel: '65%', handling: '80%' };

    const sEl = document.getElementById('spec-speed');
    const aEl = document.getElementById('spec-accel');
    const hEl = document.getElementById('spec-handling');
    if (sEl) sEl.style.width = specs.speed;
    if (aEl) aEl.style.width = specs.accel;
    if (hEl) hEl.style.width = specs.handling;
  }

  updateSoundButtonState() {
    const btn = document.getElementById('btn-toggle-sound');
    if (!btn) return;
    if (soundManager.isMuted) {
      btn.textContent = '🔇 SOUND: OFF (M)';
      btn.style.background = 'rgba(255, 42, 42, 0.35)';
      btn.style.borderColor = '#ff2a2a';
      btn.style.color = '#ff9999';
    } else {
      btn.textContent = '🔊 SOUND: ON (M)';
      btn.style.background = 'rgba(0, 255, 255, 0.2)';
      btn.style.borderColor = '#00ffff';
      btn.style.color = '#fff';
    }
  }
}
