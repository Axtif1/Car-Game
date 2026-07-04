import mongoose from 'mongoose';

/**
 * Robust Database Controller
 * Connects to MongoDB if available, otherwise seamlessly falls back to in-memory persistence.
 */
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.inMemoryUsers = new Map();
    this.inMemoryLeaderboard = [
      { username: 'SpeedDemon', bestLapTime: 42.15, carCategory: 'super', date: new Date() },
      { username: 'DriftKing99', bestLapTime: 44.80, carCategory: 'sports', date: new Date() },
      { username: 'ViperV8', bestLapTime: 46.32, carCategory: 'muscle', date: new Date() },
      { username: 'ApexRacer', bestLapTime: 47.90, carCategory: 'sports', date: new Date() },
      { username: 'TurboBoost', bestLapTime: 49.05, carCategory: 'super', date: new Date() }
    ];
  }

  async connect(uri = process.env.MONGODB_URI || 'mongodb+srv://aatif:aatif@cluster0.zmydec2.mongodb.net/cargame-db?retryWrites=true&w=majority') {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      this.isConnected = true;
      console.log('✅ [Database] Connected to MongoDB successfully.');
    } catch (error) {
      this.isConnected = false;
      console.warn(`⚠️ [Database] MongoDB connection failed (${error.message}). Using robust In-Memory fallback storage.`);
    }
  }

  async getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    if (this.isConnected) {
      try {
        return await UserModal.findOne({ email: cleanEmail });
      } catch (err) {
        console.error('Mongo error in getUserByEmail:', err.message);
      }
    }
    for (const [_, user] of this.inMemoryUsers) {
      if (user.email && user.email.toLowerCase() === cleanEmail) {
        return user;
      }
    }
    return null;
  }

  async createUserAuth({ name, email, password, avatar }) {
    const cleanEmail = email.toLowerCase().trim();
    const username = name.trim();
    const chosenAvatar = avatar || '/avatars/avatar1.png';
    const defaultGarage = {
      carType: 'sports',
      bodyColor: '#ff2a2a',
      rimColor: '#dcdcdc',
      neonColor: '#00ffff',
      spoiler: 1,
      wheels: 1,
      windowTint: 0.7
    };

    if (this.isConnected) {
      try {
        return await UserModal.create({
          username,
          name: username,
          email: cleanEmail,
          password,
          avatar: chosenAvatar,
          coins: 5000,
          xp: 0,
          level: 1,
          unlockedCars: ['sports', 'super', 'muscle'],
          garage: defaultGarage
        });
      } catch (err) {
        console.error('Mongo error in createUserAuth, falling back to memory:', err.message);
      }
    }

    const newUser = {
      _id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username,
      name: username,
      email: cleanEmail,
      password,
      avatar: chosenAvatar,
      coins: 5000,
      xp: 0,
      level: 1,
      unlockedCars: ['sports', 'super', 'muscle'],
      garage: defaultGarage,
      bestLap: null,
      wins: 0,
      losses: 0
    };
    this.inMemoryUsers.set(cleanEmail, newUser);
    this.inMemoryUsers.set(username, newUser);
    return newUser;
  }

  /**
   * Get or create a user profile
   */
  async getOrCreateUser(username) {
    if (!username) username = `Racer_${Math.floor(Math.random() * 8999 + 1000)}`;

    if (this.isConnected) {
      try {
        let user = await UserModal.findOne({ username });
        if (!user) {
          user = await UserModal.create({
            username,
            coins: 5000,
            xp: 0,
            level: 1,
            unlockedCars: ['sports', 'super', 'muscle'],
            garage: {
              carType: 'sports',
              bodyColor: '#ff2a2a',
              rimColor: '#dcdcdc',
              neonColor: '#00ffff',
              spoiler: 1,
              wheels: 1,
              windowTint: 0.7
            },
            bestLap: null,
            wins: 0,
            losses: 0
          });
        }
        return user;
      } catch (err) {
        console.error('Mongo error, falling back to memory:', err.message);
      }
    }

    // In-memory fallback
    if (!this.inMemoryUsers.has(username)) {
      this.inMemoryUsers.set(username, {
        _id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username,
        coins: 5000,
        xp: 150,
        level: 2,
        unlockedCars: ['sports', 'super', 'muscle'],
        garage: {
          carType: 'sports',
          bodyColor: '#ff2a2a',
          rimColor: '#e0e0e0',
          neonColor: '#00ffff',
          spoiler: 1,
          wheels: 1,
          windowTint: 0.7
        },
        bestLap: 45.2,
        wins: 3,
        losses: 1
      });
    }
    return this.inMemoryUsers.get(username);
  }

  /**
   * Save garage customization
   */
  async saveGarage(username, garageData) {
    if (this.isConnected) {
      try {
        await UserModal.findOneAndUpdate({ username }, { $set: { garage: garageData } });
        return true;
      } catch (err) {
        console.error('Failed saving garage to Mongo:', err.message);
      }
    }
    const user = this.inMemoryUsers.get(username);
    if (user) {
      user.garage = { ...user.garage, ...garageData };
    }
    return true;
  }

  /**
   * Record race stats
   */
  async recordRaceResult(username, lapTime, isWinner) {
    if (this.isConnected) {
      try {
        const update = {
          $inc: {
            coins: isWinner ? 1500 : 500,
            xp: isWinner ? 300 : 100,
            wins: isWinner ? 1 : 0,
            losses: isWinner ? 0 : 1
          }
        };
        const user = await UserModal.findOneAndUpdate({ username }, update, { new: true });
        if (lapTime && (!user.bestLap || lapTime < user.bestLap)) {
          user.bestLap = lapTime;
          await user.save();
        }
        return user;
      } catch (err) {
        console.error('Failed recording race result:', err.message);
      }
    }
    const user = this.inMemoryUsers.get(username);
    if (user) {
      user.coins += isWinner ? 1500 : 500;
      user.xp += isWinner ? 300 : 100;
      if (isWinner) user.wins++; else user.losses++;
      if (lapTime && (!user.bestLap || lapTime < user.bestLap)) {
        user.bestLap = lapTime;
        this.inMemoryLeaderboard.push({
          username,
          bestLapTime: lapTime,
          carCategory: user.garage?.carType || 'sports',
          date: new Date()
        });
        this.inMemoryLeaderboard.sort((a, b) => a.bestLapTime - b.bestLapTime);
      }
    }
  }

  async getLeaderboard() {
    if (this.isConnected) {
      try {
        const users = await UserModal.find({ bestLap: { $ne: null } })
          .sort({ bestLap: 1 })
          .limit(10);
        return users.map(u => ({
          username: u.username,
          bestLapTime: u.bestLap,
          carCategory: u.garage?.carType || 'sports'
        }));
      } catch (err) {
        console.error('Failed fetching leaderboard from Mongo:', err.message);
      }
    }
    return this.inMemoryLeaderboard.slice(0, 10);
  }
}

// Mongoose Schema definition
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  avatar: { type: String, default: '/avatars/avatar1.png' },
  coins: { type: Number, default: 5000 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  unlockedCars: [{ type: String }],
  garage: {
    carType: { type: String, default: 'sports' },
    bodyColor: { type: String, default: '#ff2a2a' },
    rimColor: { type: String, default: '#dcdcdc' },
    neonColor: { type: String, default: '#00ffff' },
    spoiler: { type: Number, default: 1 },
    wheels: { type: Number, default: 1 },
    windowTint: { type: Number, default: 0.7 }
  },
  bestLap: { type: Number, default: null },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 }
}, { timestamps: true });

const UserModal = mongoose.models.User || mongoose.model('User', userSchema);

export const dbManager = new DatabaseManager();
