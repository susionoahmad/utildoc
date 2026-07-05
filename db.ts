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
  { id: 'usr-1', email: 'vance.types@editorial.co', name: 'Vance Typesetting', plan: 'enterprise', status: 'active', joinedDate: '2026-01-15', docsProcessed: 1420, amountPaid: 495.00 },
  { id: 'usr-2', email: 'helena@swissgrid.design', name: 'Swissgrid Design', plan: 'pro', status: 'active', joinedDate: '2026-02-01', docsProcessed: 310, amountPaid: 76.00 },
  { id: 'usr-3', email: 'm.keller@bauhaus-archive.de', name: 'Martin Keller', plan: 'starter', status: 'active', joinedDate: '2026-03-10', docsProcessed: 14, amountPaid: 0 },
  { id: 'usr-4', email: 'dossier_review@taxaudit.intl', name: 'Tax Review Agency', plan: 'enterprise', status: 'active', joinedDate: '2026-03-22', docsProcessed: 2890, amountPaid: 396.00 },
  { id: 'usr-5', email: 'beatrice@monoforms.xyz', name: 'Beatrice Forms', plan: 'pro', status: 'active', joinedDate: '2026-04-05', docsProcessed: 95, amountPaid: 38.00 },
  { id: 'usr-6', email: 'curator@metropolitan-press.org', name: 'Metro Press Curator', plan: 'starter', status: 'suspended', joinedDate: '2026-04-18', docsProcessed: 0, amountPaid: 0 },
  { id: 'usr-7', email: 'production@gallimard-editions.fr', name: 'Gallimard Production', plan: 'enterprise', status: 'active', joinedDate: '2026-05-12', docsProcessed: 820, amountPaid: 198.00 },
  { id: 'usr-8', email: 'clara.scholz@typografie.at', name: 'Clara Scholz', plan: 'pro', status: 'active', joinedDate: '2026-06-01', docsProcessed: 45, amountPaid: 19.00 }
];

const DEFAULT_TRANSACTIONS = [
  { id: 'tx-8041', userEmail: 'vance.types@editorial.co', plan: 'enterprise', amount: 99.00, gateway: 'Stripe', status: 'completed', date: '2026-06-15 10:24' },
  { id: 'tx-8040', userEmail: 'clara.scholz@typografie.at', plan: 'pro', amount: 19.00, gateway: 'Midtrans', status: 'completed', date: '2026-06-01 14:15' },
  { id: 'tx-8039', userEmail: 'production@gallimard-editions.fr', plan: 'enterprise', amount: 99.00, gateway: 'Stripe', status: 'completed', date: '2026-05-12 09:02' },
  { id: 'tx-8038', userEmail: 'helena@swissgrid.design', plan: 'pro', amount: 19.00, gateway: 'PayPal', status: 'completed', date: '2026-05-01 18:30' },
  { id: 'tx-8037', userEmail: 'dossier_review@taxaudit.intl', plan: 'enterprise', amount: 99.00, gateway: 'Stripe', status: 'completed', date: '2026-04-22 11:11' },
  { id: 'tx-8036', userEmail: 'beatrice@monoforms.xyz', plan: 'pro', amount: 19.00, gateway: 'Midtrans', status: 'completed', date: '2026-04-05 16:40' },
  { id: 'tx-8035', userEmail: 'vance.types@editorial.co', plan: 'enterprise', amount: 99.00, gateway: 'Stripe', status: 'completed', date: '2026-04-15 10:19' },
  { id: 'tx-8034', userEmail: 'helena@swissgrid.design', plan: 'pro', amount: 19.00, gateway: 'PayPal', status: 'completed', date: '2026-04-01 18:25' }
];

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
        joined_date DATE DEFAULT CURRENT_DATE,
        docs_processed INTEGER DEFAULT 0,
        amount_paid NUMERIC(10, 2) DEFAULT 0.00
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

    // Check if we need to seed
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      console.log('Seeding initial users...');
      const defaultPasswordHash = hashPassword('password'); // Default password is 'password'
      for (const u of DEFAULT_USERS) {
        await client.query(
          `INSERT INTO users (id, email, password_hash, name, plan, status, joined_date, docs_processed, amount_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [u.id, u.email, defaultPasswordHash, u.name, u.plan, u.status, u.joinedDate, u.docsProcessed, u.amountPaid]
        );
      }
    }

    const txCheck = await client.query('SELECT COUNT(*) FROM transactions');
    if (parseInt(txCheck.rows[0].count, 10) === 0) {
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
  const res = await pool.query('SELECT id, email, name, plan, status, joined_date as "joinedDate", docs_processed as "docsProcessed", amount_paid as "amountPaid" FROM users ORDER BY joined_date DESC, id DESC');
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
    joinedDate: r.joined_date instanceof Date ? r.joined_date.toISOString().slice(0, 10) : r.joined_date,
    docsProcessed: parseInt(r.docs_processed, 10),
    amountPaid: parseFloat(r.amount_paid)
  };
}

export async function addUser(user: { email: string; passwordHash: string; name: string; plan: string; status: string }) {
  const id = `usr-${Math.floor(Math.random() * 10000)}`;
  const joinedDate = new Date().toISOString().slice(0, 10);
  const docsProcessed = 0;
  const amountPaid = user.plan === 'pro' ? 19.00 : user.plan === 'enterprise' ? 99.00 : 0.00;
  
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, plan, status, joined_date, docs_processed, amount_paid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, user.email, user.passwordHash, user.name, user.plan, user.status, joinedDate, docsProcessed, amountPaid]
  );
  
  return { id, email: user.email, name: user.name, plan: user.plan, status: user.status, joinedDate, docsProcessed, amountPaid };
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

  const docsProcessedTotal = users.reduce((sum, u) => sum + u.docsProcessed, 0) + 12050;
  const apiCallsTotal = docsProcessedTotal * 3 + 8240;

  const paidUsersCount = users.filter(u => u.plan !== 'starter').length;
  const conversionRate = users.length > 0 ? (paidUsersCount / users.length) * 100 : 0;

  return {
    totalRevenue,
    docsProcessedTotal,
    apiCallsTotal,
    conversionRate
  };
}
