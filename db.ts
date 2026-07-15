import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/utildoc';

export const pool = new Pool({
  connectionString,
});

// Helper to hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initial Mock Data
const DEFAULT_USERS = [
  { id: 'usr-admin', email: 'admin@utildoc.com', name: 'Administrator', plan: 'enterprise', status: 'active', role: 'admin', joinedDate: '2026-07-15', docsProcessed: 0, amountPaid: 0.00 }
];

const DEFAULT_TRANSACTIONS: any[] = [];

const DEFAULT_SETTINGS = {
  stripeActive: true,
  midtransActive: true,
  maintenanceMode: false,
  rateLimitPerMin: 120,
  stripeSecretKeyConfigured: true,
  midtransClientKeyConfigured: true,
  adsterraActive: true,
  adsterraDirectLink: 'https://www.profitablecpmgate.com/o84mgnk2?key=38198f7df43e93657788ea12030b65f3'
};

// Initialize Tables
export async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Initializing PostgreSQL database tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        plan VARCHAR(50) DEFAULT 'starter',
        status VARCHAR(50) DEFAULT 'active',
        role VARCHAR(50) DEFAULT 'user',
        joined_date DATE DEFAULT CURRENT_DATE,
        docs_processed INTEGER DEFAULT 0,
        amount_paid NUMERIC(10, 2) DEFAULT 0.00
      );
    `);

    // Ensure role column exists if table already existed
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
    `);

    // Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(50) PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Guest activity counters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS guest_activity_counters (
        tool_type VARCHAR(100) PRIMARY KEY,
        count INTEGER DEFAULT 0
      );
    `);

    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        plan VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        gateway VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Settings table (key-value)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Clean up old dummy users and transactions
    await client.query(`
      DELETE FROM users WHERE id IN ('usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7', 'usr-8');
    `);
    await client.query(`
      DELETE FROM transactions WHERE id IN ('tx-8041', 'tx-8040', 'tx-8039', 'tx-8038', 'tx-8037', 'tx-8036', 'tx-8035', 'tx-8034');
    `);

    // Check if we need to seed admin user specifically
    const adminCheck = await client.query('SELECT * FROM users WHERE email = $1', ['admin@utildoc.com']);
    if (adminCheck.rows.length === 0) {
      console.log('Seeding admin@utildoc.com user...');
      const defaultPasswordHash = hashPassword('admin123'); // Default admin password is 'admin123'
      const u = DEFAULT_USERS[0];
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, plan, status, role, docs_processed, amount_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [u.id, u.email, defaultPasswordHash, u.name, u.plan, u.status, u.role, u.docsProcessed, u.amountPaid]
      );
    }

    const txCheck = await client.query('SELECT COUNT(*) FROM transactions');
    if (parseInt(txCheck.rows[0].count, 10) === 0 && DEFAULT_TRANSACTIONS.length > 0) {
      console.log('Seeding initial transactions...');
      for (const tx of DEFAULT_TRANSACTIONS) {
        await client.query(
          `INSERT INTO transactions (id, user_email, plan, amount, gateway, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tx.id, tx.userEmail, tx.plan, tx.amount, tx.gateway, tx.status, new Date(tx.date)]
        );
      }
    }

    const settingsCheck = await client.query('SELECT COUNT(*) FROM settings');
    if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
      console.log('Seeding initial SaaS settings...');
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await client.query(
          'INSERT INTO settings (key, value) VALUES ($1, $2)',
          [key, JSON.stringify(value)]
        );
      }
    } else {
      // Ensure Adsterra settings are initialized if db was already seeded
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        ['adsterraActive', JSON.stringify(DEFAULT_SETTINGS.adsterraActive)]
      );
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        ['adsterraDirectLink', JSON.stringify(DEFAULT_SETTINGS.adsterraDirectLink)]
      );
    }

    console.log('PostgreSQL database ready.');
  } catch (error) {
    console.error('Error during database initialization:', error);
  } finally {
    client.release();
  }
}

// User CRUD Helpers
export async function getUsers() {
  const res = await pool.query('SELECT id, email, name, plan, status, role, joined_date as "joinedDate", docs_processed as "docsProcessed", amount_paid as "amountPaid" FROM users ORDER BY joined_date DESC, id DESC');
  return res.rows.map(r => ({
    ...r,
    joinedDate: r.joinedDate instanceof Date ? r.joinedDate.toISOString().slice(0, 10) : r.joinedDate,
    amountPaid: parseFloat(r.amountPaid),
    docsProcessed: parseInt(r.docsProcessed, 10)
  }));
}

export async function getUserByEmail(email: string) {
  const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    plan: r.plan,
    status: r.status,
    role: r.role || 'user',
    joinedDate: r.joined_date instanceof Date ? r.joined_date.toISOString().slice(0, 10) : r.joined_date,
    docsProcessed: parseInt(r.docs_processed, 10),
    amountPaid: parseFloat(r.amount_paid)
  };
}

export async function getUserById(id: string) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    plan: r.plan,
    status: r.status,
    role: r.role || 'user',
    joinedDate: r.joined_date instanceof Date ? r.joined_date.toISOString().slice(0, 10) : r.joined_date,
    docsProcessed: parseInt(r.docs_processed, 10),
    amountPaid: parseFloat(r.amount_paid)
  };
}

export async function addUser(user: { email: string; passwordHash: string; name: string; plan: string; status: string; role?: string }) {
  const id = `usr-${Math.floor(Math.random() * 10000)}`;
  const joinedDate = new Date().toISOString().slice(0, 10);
  const docsProcessed = 0;
  const amountPaid = 0.00;
  const role = user.role || 'user';
  
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, plan, status, role, joined_date, docs_processed, amount_paid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, user.email, user.passwordHash, user.name, user.plan, user.status, role, joinedDate, docsProcessed, amountPaid]
  );
  
  return { id, email: user.email, name: user.name, plan: user.plan, status: user.status, role, joinedDate, docsProcessed, amountPaid };
}

export async function updateUser(id: string, updates: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (updates.email !== undefined) {
    fields.push(`email = $${index++}`);
    values.push(updates.email);
  }
  if (updates.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(updates.name);
  }
  if (updates.plan !== undefined) {
    fields.push(`plan = $${index++}`);
    values.push(updates.plan);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(updates.status);
  }
  if (updates.docsProcessed !== undefined) {
    fields.push(`docs_processed = $${index++}`);
    values.push(updates.docsProcessed);
  }
  if (updates.amountPaid !== undefined) {
    fields.push(`amount_paid = $${index++}`);
    values.push(updates.amountPaid);
  }
  if (updates.passwordHash !== undefined) {
    fields.push(`password_hash = $${index++}`);
    values.push(updates.passwordHash);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${index++}`);
    values.push(updates.role);
  }

  if (fields.length === 0) return;

  values.push(id);
  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${index}`;
  await pool.query(query, values);
}

export async function deleteUser(id: string) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

// Transactions CRUD
export async function getTransactions() {
  const res = await pool.query('SELECT id, user_email as "userEmail", plan, amount, gateway, status, created_at as "date" FROM transactions ORDER BY created_at DESC, id DESC');
  return res.rows.map(r => {
    const d = r.date instanceof Date ? r.date : new Date(r.date);
    const dateFormatted = `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
    return {
      ...r,
      amount: parseFloat(r.amount),
      date: dateFormatted
    };
  });
}

export async function addTransaction(tx: { userEmail: string; plan: string; amount: number; gateway: string; status: string }) {
  const id = `tx-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  
  await pool.query(
    `INSERT INTO transactions (id, user_email, plan, amount, gateway, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, tx.userEmail, tx.plan, tx.amount, tx.gateway, tx.status, now]
  );

  const dateFormatted = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

  if (tx.status === 'completed') {
    const user = await getUserByEmail(tx.userEmail);
    if (user) {
      await updateUser(user.id, {
        plan: tx.plan,
        amountPaid: user.amountPaid + tx.amount
      });
    } else {
      const defaultPasswordHash = hashPassword('password');
      await addUser({
        email: tx.userEmail,
        passwordHash: defaultPasswordHash,
        name: tx.userEmail.split('@')[0].toUpperCase(),
        plan: tx.plan,
        status: 'active'
      });
    }
  }

  return { id, userEmail: tx.userEmail, plan: tx.plan, amount: tx.amount, gateway: tx.gateway, status: tx.status, date: dateFormatted };
}

// Settings CRUD
export async function getSettings() {
  const res = await pool.query('SELECT key, value FROM settings');
  const settingsObj: any = {};
  for (const row of res.rows) {
    settingsObj[row.key] = JSON.parse(row.value);
  }
  
  return {
    stripeActive: settingsObj.stripeActive !== undefined ? settingsObj.stripeActive : DEFAULT_SETTINGS.stripeActive,
    midtransActive: settingsObj.midtransActive !== undefined ? settingsObj.midtransActive : DEFAULT_SETTINGS.midtransActive,
    maintenanceMode: settingsObj.maintenanceMode !== undefined ? settingsObj.maintenanceMode : DEFAULT_SETTINGS.maintenanceMode,
    rateLimitPerMin: settingsObj.rateLimitPerMin !== undefined ? settingsObj.rateLimitPerMin : DEFAULT_SETTINGS.rateLimitPerMin,
    stripeSecretKeyConfigured: settingsObj.stripeSecretKeyConfigured !== undefined ? settingsObj.stripeSecretKeyConfigured : DEFAULT_SETTINGS.stripeSecretKeyConfigured,
    midtransClientKeyConfigured: settingsObj.midtransClientKeyConfigured !== undefined ? settingsObj.midtransClientKeyConfigured : DEFAULT_SETTINGS.midtransClientKeyConfigured,
    adsterraActive: settingsObj.adsterraActive !== undefined ? settingsObj.adsterraActive : DEFAULT_SETTINGS.adsterraActive,
    adsterraDirectLink: settingsObj.adsterraDirectLink !== undefined ? settingsObj.adsterraDirectLink : DEFAULT_SETTINGS.adsterraDirectLink,
  };
}

export async function saveSettings(settings: any) {
  for (const [key, value] of Object.entries(settings)) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, JSON.stringify(value)]
    );
  }
}

// Metrics Aggregator
export async function getMetrics() {
  const users = await getUsers();
  const txs = await getTransactions();

  const totalRevenue = txs
    .filter(tx => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Real document processed calculation:
  // 1. Registered user actions that are tool activities (i.e. not AUTH_LOGIN, AUTH_REGISTER, AUTH_LOGOUT, etc.)
  const toolActivitiesRes = await pool.query(`
    SELECT COUNT(*) FROM activity_logs 
    WHERE activity_type NOT IN ('AUTH_LOGIN', 'AUTH_REGISTER', 'AUTH_LOGOUT', 'AUTH_SETTINGS', 'AUTH_DELETE_USER')
  `);
  const registeredToolCount = parseInt(toolActivitiesRes.rows[0].count, 10);

  // 2. Guest activity counters
  const guestCountRes = await pool.query('SELECT SUM(count) FROM guest_activity_counters');
  const guestToolCount = parseInt(guestCountRes.rows[0].sum || '0', 10);

  const docsProcessedTotal = registeredToolCount + guestToolCount;

  // Real api calls count (all activity logs + all guest counters)
  const totalLogsRes = await pool.query('SELECT COUNT(*) FROM activity_logs');
  const totalLogsCount = parseInt(totalLogsRes.rows[0].count, 10);
  const apiCallsTotal = totalLogsCount + guestToolCount;

  const paidUsersCount = users.filter(u => u.plan !== 'starter').length;
  const conversionRate = users.length > 0 ? (paidUsersCount / users.length) * 100 : 0;

  return {
    totalRevenue,
    docsProcessedTotal,
    apiCallsTotal,
    conversionRate
  };
}

export async function addActivityLog(userEmail: string, activityType: string, description: string) {
  const id = `act-${Math.floor(Math.random() * 100000)}`;
  await pool.query(
    `INSERT INTO activity_logs (id, user_email, activity_type, description, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
    [id, userEmail, activityType, description]
  );
}

export async function getActivityLogs() {
  const res = await pool.query('SELECT id, user_email as "userEmail", activity_type as "activityType", description, created_at as "date" FROM activity_logs ORDER BY created_at DESC LIMIT 100');
  return res.rows.map(r => {
    const d = r.date instanceof Date ? r.date : new Date(r.date);
    const dateFormatted = `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
    return {
      id: r.id,
      userEmail: r.userEmail,
      activityType: r.activityType,
      description: r.description,
      date: dateFormatted
    };
  });
}

export async function incrementGuestCounter(toolType: string) {
  await pool.query(
    `INSERT INTO guest_activity_counters (tool_type, count)
     VALUES ($1, 1)
     ON CONFLICT (tool_type)
     DO UPDATE SET count = guest_activity_counters.count + 1`,
    [toolType]
  );
}

export async function getToolUsageRanking() {
  const loggedInRes = await pool.query(`
    SELECT activity_type as "toolType", COUNT(*) as count 
    FROM activity_logs 
    WHERE activity_type IN ('MERGE_PDF', 'SPLIT_PDF', 'COMPRESS_PDF', 'VIEW_METADATA', 'ROTATE_PDF', 'WATERMARK_PDF', 'ENCRYPT_PDF', 'PDF_TO_IMAGE', 'IMAGE_TO_PDF', 'IMAGE_CONVERTER', 'OCR_SCAN', 'AI_FIX')
    GROUP BY activity_type
  `);
  
  const guestRes = await pool.query(`
    SELECT tool_type as "toolType", count 
    FROM guest_activity_counters
  `);
  
  const rankingMap = new Map<string, number>();
  
  const ALL_TOOLS = [
    'MERGE_PDF', 'SPLIT_PDF', 'COMPRESS_PDF', 'VIEW_METADATA',
    'ROTATE_PDF', 'WATERMARK_PDF', 'ENCRYPT_PDF', 'PDF_TO_IMAGE',
    'IMAGE_TO_PDF', 'IMAGE_CONVERTER', 'OCR_SCAN', 'AI_FIX'
  ];
  for (const t of ALL_TOOLS) {
    rankingMap.set(t, 0);
  }
  
  for (const row of loggedInRes.rows) {
    rankingMap.set(row.toolType, (rankingMap.get(row.toolType) || 0) + parseInt(row.count, 10));
  }
  for (const row of guestRes.rows) {
    rankingMap.set(row.toolType, (rankingMap.get(row.toolType) || 0) + parseInt(row.count, 10));
  }
  
  const ranking = Array.from(rankingMap.entries()).map(([toolType, count]) => ({
    toolType,
    count
  })).sort((a, b) => b.count - a.count);
  
  return ranking;
}
