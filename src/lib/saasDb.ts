// src/lib/saasDb.ts

export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';
export type UserStatus = 'active' | 'suspended';
export type PaymentGateway = 'Stripe' | 'Midtrans' | 'PayPal' | 'Bank Transfer';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface SaaSUser {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
  status: UserStatus;
  joinedDate: string;
  docsProcessed: number;
  amountPaid: number;
}

export interface SaasTransaction {
  id: string;
  userEmail: string;
  plan: SubscriptionPlan;
  amount: number;
  gateway: PaymentGateway;
  status: TransactionStatus;
  date: string;
}

export interface SaaSMetrics {
  totalRevenue: number;
  docsProcessedTotal: number;
  apiCallsTotal: number;
  conversionRate: number;
}

export interface SaasSettings {
  stripeActive: boolean;
  midtransActive: boolean;
  maintenanceMode: boolean;
  rateLimitPerMin: number;
  stripeSecretKeyConfigured: boolean;
  midtransClientKeyConfigured: boolean;
  adsterraActive: boolean;
  adsterraDirectLink: string;
}

export class SaaSDB {
  private static getHeaders() {
    const token = localStorage.getItem('utildoc_session_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // --- Auth APIs ---

  static async getActiveUserSession(): Promise<{ isLoggedIn: boolean; email: string; plan: SubscriptionPlan; name: string; role?: string } | null> {
    const token = localStorage.getItem('utildoc_session_token');
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/session', { headers: this.getHeaders() });
      if (!res.ok) {
        localStorage.removeItem('utildoc_session_token');
        return null;
      }
      const data = await res.json();
      if (data.isLoggedIn) {
        return data;
      } else {
        localStorage.removeItem('utildoc_session_token');
        return null;
      }
    } catch {
      return null;
    }
  }

  static async login(email: string, password: string): Promise<{ isLoggedIn: boolean; email: string; plan: SubscriptionPlan; name: string; role?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('utildoc_session_token', data.token);
    return data.session;
  }

  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch (e) {
      console.error('Logout API failure:', e);
    } finally {
      localStorage.removeItem('utildoc_session_token');
      // Dispatch storage event to notify other components/tabs
      window.dispatchEvent(new Event('storage'));
    }
  }

  static async register(email: string, password: string, name: string): Promise<{ isLoggedIn: boolean; email: string; plan: SubscriptionPlan; name: string; role?: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('utildoc_session_token', data.token);
    return data.session;
  }

  static async logActivity(toolType: string): Promise<void> {
    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ toolType })
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to change password.');
    }
  }

  // --- Billing / Checkout API ---

  static async checkout(email: string, plan: string, amount: number, gateway: string): Promise<void> {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, plan, amount, gateway })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Checkout failed');
    }
  }

  // --- Admin API Endpoints ---

  static async getUsers(): Promise<SaaSUser[]> {
    const res = await fetch('/api/admin/data', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    return data.users;
  }

  static async getTransactions(): Promise<SaasTransaction[]> {
    const res = await fetch('/api/admin/data', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    return data.transactions;
  }

  static async getSettings(): Promise<SaasSettings> {
    const res = await fetch('/api/settings', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  static async getMetrics(): Promise<SaaSMetrics> {
    const res = await fetch('/api/admin/data', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch metrics');
    const data = await res.json();
    return data.metrics;
  }

  static async getAdminData(): Promise<{ users: SaaSUser[]; transactions: SaasTransaction[]; settings: SaasSettings; metrics: SaaSMetrics; activityLogs?: any[]; toolRanking?: any[] }> {
    const res = await fetch('/api/admin/data', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch admin dashboard payload');
    return res.json();
  }

  static async addUser(user: Omit<SaaSUser, 'id' | 'joinedDate' | 'docsProcessed' | 'amountPaid'>): Promise<SaaSUser> {
    const res = await fetch('/api/admin/users/add', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add user');
    }
    const data = await res.json();
    return data.user;
  }

  static async updateUser(id: string, updates: Partial<SaaSUser>): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user');
    }
  }

  static async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete user');
    }
  }

  static async addTransaction(tx: Omit<SaasTransaction, 'id' | 'date'>): Promise<SaasTransaction> {
    const res = await fetch('/api/admin/transactions/add', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(tx)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to log transaction');
    }
    const data = await res.json();
    return data.transaction;
  }

  static async saveSettings(settings: SaasSettings): Promise<void> {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save settings');
    }
  }
}
