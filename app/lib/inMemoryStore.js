import bcrypt from "bcryptjs";

// In-memory data storage fallback when MongoDB is offline
const defaultSettings = {
  _id: "settings_default_001",
  CoinFlipEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "Game is temporarily under maintenance. Please try again later.",
  minBet: 10,
  maxBet: 10000,
  payoutMultiplier: 2,
  minDeposit: 10,
  maxDeposit: 50000,
  minWithdrawal: 100,
  maxWithdrawal: 50000,
  depositEnabled: true,
  upiId: "admin@upi",
  qrCode: "",
  depositInstructions: "Pay using the provided UPI QR and submit your UTR number.",
  withdrawalEnabled: true,
  manualWithdrawalApproval: true,
  withdrawalMessage: "Withdrawal requests are processed manually.",
  announcementEnabled: false,
  announcement: "",
  supportContact: "support@coinflip.game",
  supportLink: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Salt rounds for demo passwords
const adminHashed = bcrypt.hashSync("admin123", 10);
const userHashed = bcrypt.hashSync("user123", 10);

const defaultAdmin = {
  _id: "user_admin_001",
  name: "Super Admin",
  email: "admin@coinflip.com",
  password: adminHashed,
  walletBalance: 25000,
  role: "admin",
  createdAt: new Date(Date.now() - 86400000 * 7),
  updatedAt: new Date(),
};

const defaultUser = {
  _id: "user_demo_002",
  name: "Demo Player",
  email: "user@example.com",
  password: userHashed,
  walletBalance: 1500,
  role: "user",
  createdAt: new Date(Date.now() - 86400000 * 3),
  updatedAt: new Date(),
};

const defaultTransactions = [
  {
    _id: "tx_001",
    user: defaultUser._id,
    type: "deposit",
    amount: 1000,
    status: "approved",
    paymentMethod: "UPI",
    utr: "UTR1002938481",
    upiId: "demo@upi",
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    _id: "tx_002",
    user: defaultUser._id,
    type: "game_entry",
    amount: 100,
    status: "completed",
    paymentMethod: "wallet",
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    _id: "tx_003",
    user: defaultUser._id,
    type: "game_win",
    amount: 200,
    status: "completed",
    paymentMethod: "wallet",
    createdAt: new Date(Date.now() - 86400000 + 3000),
    updatedAt: new Date(Date.now() - 86400000 + 3000),
  }
];

const defaultGames = [
  {
    _id: "game_001",
    user: defaultUser._id,
    gameType: "CoinFlip",
    prediction: "heads",
    result: "heads",
    entryFee: 100,
    winAmount: 200,
    status: "won",
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  }
];

// In-memory collections stored on global object across hot reloads
if (!global.__inMemoryDb) {
  global.__inMemoryDb = {
    users: [defaultAdmin, defaultUser],
    games: [...defaultGames],
    transactions: [...defaultTransactions],
    withdraws: [],
    settings: [{ ...defaultSettings }],
  };
}

export const inMemoryDb = global.__inMemoryDb;
