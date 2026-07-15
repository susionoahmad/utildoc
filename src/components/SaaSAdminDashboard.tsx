// src/components/SaaSAdminDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, CreditCard, TrendingUp, FileText, Settings, ShieldCheck, 
  Activity, CheckCircle2, AlertCircle, Loader2, Search, Filter, 
  Plus, Trash2, Edit, RefreshCw, SlidersHorizontal, Globe, Key, 
  DollarSign, Server, Play, Square, Check, X, ArrowUpRight, HelpCircle,
  Sparkles
} from 'lucide-react';
import { SaaSDB, SaaSUser, SaasTransaction, SaasSettings, SaaSMetrics, SubscriptionPlan, UserStatus, PaymentGateway, TransactionStatus } from '../lib/saasDb';

interface SaaSAdminDashboardProps {
  darkMode: boolean;
  setView: (view: string) => void;
}

export default function SaaSAdminDashboard({ darkMode, setView }: SaaSAdminDashboardProps) {
  // DB States
  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [transactions, setTransactions] = useState<SaasTransaction[]>([]);
  const [settings, setSettings] = useState<SaasSettings>({
    stripeActive: true,
    midtransActive: true,
    maintenanceMode: false,
    rateLimitPerMin: 120,
    stripeSecretKeyConfigured: true,
    midtransClientKeyConfigured: true
  });
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    totalRevenue: 0,
    docsProcessedTotal: 0,
    apiCallsTotal: 0,
    conversionRate: 0
  });

  // UI States
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'logs' | 'gateways'>('overview');
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [toolRanking, setToolRanking] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);


  // User Form Modals
  const [editingUser, setEditingUser] = useState<SaaSUser | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('starter');


  // Load Database values
  const refreshDbData = async () => {
    setIsRefreshing(true);
    try {
      const data = await SaaSDB.getAdminData();
      setUsers(data.users);
      setTransactions(data.transactions);
      setSettings(data.settings);
      setMetrics(data.metrics);
      if (data.activityLogs) setActivityLogs(data.activityLogs);
      if (data.toolRankings) {
        setToolRanking(data.toolRankings);
      } else if (data.toolRanking) {
        setToolRanking(data.toolRanking);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await SaaSDB.getAdminData();
        setUsers(data.users);
        setTransactions(data.transactions);
        setSettings(data.settings);
        setMetrics(data.metrics);
        if (data.activityLogs) setActivityLogs(data.activityLogs);
        if (data.toolRankings) {
          setToolRanking(data.toolRankings);
        } else if (data.toolRanking) {
          setToolRanking(data.toolRanking);
        }
      } catch (e) {
        console.error('Failed to hydrate admin dashboard:', e);
      }
    };
    initData();
  }, []);

  // User Actions handlers
  const handleToggleUserStatus = async (user: SaaSUser) => {
    const newStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await SaaSDB.updateUser(user.id, { status: newStatus });
      console.log(`User ${user.email} status set to ${newStatus.toUpperCase()}`);
      const updatedList = await SaaSDB.getUsers();
      setUsers(updatedList);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await SaaSDB.updateUser(editingUser.id, {
        name: editingUser.name,
        plan: editingUser.plan,
        status: editingUser.status
      });
      console.log(`User ${editingUser.email} profile modified by administrator.`);
      setEditingUser(null);
      const data = await SaaSDB.getAdminData();
      setUsers(data.users);
      setMetrics(data.metrics);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    try {
      const added = await SaaSDB.addUser({
        email: newUserEmail,
        name: newUserName.trim() || newUserEmail.split('@')[0].toUpperCase(),
        plan: newUserPlan,
        status: 'active'
      });
      console.log(`Manual Onboard: User ${added.email} created with tier ${added.plan.toUpperCase()}.`);
      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPlan('starter');
      const data = await SaaSDB.getAdminData();
      setUsers(data.users);
      setMetrics(data.metrics);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (confirm(`Are you sure you want to completely remove user ${email}?`)) {
      try {
        await SaaSDB.deleteUser(id);
        console.log(`User ${email} permanently purged from SaaS directory.`);
        const data = await SaaSDB.getAdminData();
        setUsers(data.users);
        setMetrics(data.metrics);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateSettings = async (key: keyof SaasSettings, val: any) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    try {
      await SaaSDB.saveSettings(updated);
      console.log(`Global system variable "${key}" adjusted to ${val}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter(user => {
    const matchQuery = user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = planFilter === 'all' || user.plan === planFilter;
    const matchStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchQuery && matchPlan && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-dashed border-[#e6e2d8] dark:border-stone-800 pb-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[#8c1d1a] dark:text-[#bfa15f]">
            <Server className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-sans font-bold tracking-widest uppercase">Admin Command Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">
            SaaS Metrics & <span className="italic font-normal">Administration</span>
          </h1>
          <p className={`text-xs font-serif mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
            Audit user behaviors, regulate billing plans, manage API pipelines, and audit Stripe/Midtrans nodes.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={refreshDbData}
            disabled={isRefreshing}
            className={`px-3 py-2 text-[10px] font-sans font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
              darkMode 
                ? 'bg-[#181817] border-stone-800 text-stone-300 hover:bg-[#20201f] disabled:opacity-50' 
                : 'bg-white border-[#e6e2d8] text-stone-700 hover:bg-stone-50 disabled:opacity-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Database
          </button>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* KPI 1: Adsterra Link Status */}
        <div className={`p-6 border rounded-none flex flex-col justify-between relative overflow-hidden ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="flex items-center justify-between mb-3 text-stone-400">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider">Adsterra Ads Link Status</span>
            <div className={`p-1.5 border rounded-none ${darkMode ? 'border-stone-800 text-[#bfa15f]/80' : 'border-stone-200 text-[#8c1d1a]/80'}`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-serif font-light tracking-tight truncate max-w-full">
              {settings.adsterraActive ? 'Active Smartlink' : 'Disabled'}
            </h3>
            <p className="text-[9px] font-mono text-stone-500 truncate max-w-full mt-1.5" title={settings.adsterraDirectLink}>
              {settings.adsterraDirectLink || 'No direct link set'}
            </p>
          </div>
          <span className="absolute bottom-0 right-0 text-[56px] font-mono leading-none font-bold opacity-3 -mr-3 -mb-3">ADS</span>
        </div>

        {/* KPI 2: Total Registered Users */}
        <div className={`p-6 border rounded-none flex flex-col justify-between relative overflow-hidden ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="flex items-center justify-between mb-3 text-stone-400">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider">Total Members</span>
            <div className={`p-1.5 border rounded-none ${darkMode ? 'border-stone-800 text-[#bfa15f]/80' : 'border-stone-200 text-[#8c1d1a]/80'}`}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif font-light tracking-tight">{users.length} registered</h3>
            <p className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1 mt-1">
              <span>All Tiers Unified to Free</span>
            </p>
          </div>
          <span className="absolute bottom-0 right-0 text-[56px] font-mono leading-none font-bold opacity-3 -mr-3 -mb-3">USR</span>
        </div>

        {/* KPI 3: Document Processing Activity */}
        <div className={`p-6 border rounded-none flex flex-col justify-between relative overflow-hidden ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="flex items-center justify-between mb-3 text-stone-400">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider">Total Documents Processed</span>
            <div className={`p-1.5 border rounded-none ${darkMode ? 'border-stone-800 text-[#bfa15f]/80' : 'border-stone-200 text-[#8c1d1a]/80'}`}>
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif font-light tracking-tight">{metrics.docsProcessedTotal.toLocaleString()} docs</h3>
            <p className="text-[10px] font-mono text-stone-500 flex items-center gap-1 mt-1">
              <span>{metrics.apiCallsTotal.toLocaleString()} Total System API Requests</span>
            </p>
          </div>
          <span className="absolute bottom-0 right-0 text-[56px] font-mono leading-none font-bold opacity-3 -mr-3 -mb-3">DOC</span>
        </div>

        {/* KPI 4: Conversion Rate */}
        <div className={`p-6 border rounded-none flex flex-col justify-between relative overflow-hidden ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="flex items-center justify-between mb-3 text-stone-400">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider">SaaS Conversion Rate</span>
            <div className={`p-1.5 border rounded-none ${darkMode ? 'border-stone-800 text-[#bfa15f]/80' : 'border-stone-200 text-[#8c1d1a]/80'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif font-light tracking-tight">{metrics.conversionRate.toFixed(1)}%</h3>
            <p className="text-[10px] font-mono text-[#bfa15f] dark:text-[#bfa15f] flex items-center gap-1 mt-1 font-bold">
              <span>Benchmark target is 15.0%</span>
            </p>
          </div>
          <span className="absolute bottom-0 right-0 text-[56px] font-mono leading-none font-bold opacity-3 -mr-3 -mb-3">CVR</span>
        </div>

      </div>

      {/* Admin Interface Tabs */}
      <div className="flex border-b border-stone-800 dark:border-stone-800/60 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2.5 font-sans font-bold uppercase tracking-widest text-[10px] border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'overview'
              ? darkMode ? 'text-[#bfa15f] border-[#bfa15f]' : 'text-[#8c1d1a] border-[#8c1d1a]'
              : 'text-stone-400 border-transparent hover:text-stone-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Overview & Live Terminal
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2.5 font-sans font-bold uppercase tracking-widest text-[10px] border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'users'
              ? darkMode ? 'text-[#bfa15f] border-[#bfa15f]' : 'text-[#8c1d1a] border-[#8c1d1a]'
              : 'text-stone-400 border-transparent hover:text-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2.5 font-sans font-bold uppercase tracking-widest text-[10px] border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'logs'
              ? darkMode ? 'text-[#bfa15f] border-[#bfa15f]' : 'text-[#8c1d1a] border-[#8c1d1a]'
              : 'text-stone-400 border-transparent hover:text-stone-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          User Activity Logs ({activityLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('gateways')}
          className={`px-4 py-2.5 font-sans font-bold uppercase tracking-widest text-[10px] border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 shrink-0 ${
            activeSubTab === 'gateways'
              ? darkMode ? 'text-[#bfa15f] border-[#bfa15f]' : 'text-[#8c1d1a] border-[#8c1d1a]'
              : 'text-stone-400 border-transparent hover:text-stone-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Adsterra Ads Config
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. OVERVIEW & CHARTS TAB */}
      {activeSubTab === 'overview' && (
        <div className={`p-6 border rounded-none ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="space-y-4">
            <div>
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider">Popular Tool Ranking (All Users & Guests)</h4>
              <p className="text-[10px] font-serif text-stone-500 mt-0.5">Aggregated metrics combining registered user logs and anonymous guest usage counters.</p>
            </div>

            {toolRanking.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center font-serif text-stone-400 italic border border-dashed border-stone-800/40">
                No activity records populated yet. Run some conversions first.
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {toolRanking.map((item, index) => {
                  const usage = item.count !== undefined ? Number(item.count) : Number(item.totalUsage || 0);
                  const maxVal = Math.max(...toolRanking.map(r => r.count !== undefined ? Number(r.count) : Number(r.totalUsage || 0)), 1);
                  const percentage = Math.min(100, Math.max(8, (usage / maxVal) * 100));
                  
                  const formatToolName = (type: string) => {
                    return type.replace(/_/g, ' ');
                  };

                  return (
                    <div key={item.toolType} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="font-bold text-stone-300 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="opacity-50 text-[9px]">#{index + 1}</span>
                          {formatToolName(item.toolType)}
                        </span>
                        <span className="font-bold text-[#bfa15f]">{usage.toLocaleString()} calls</span>
                      </div>
                      <div className="w-full h-2 bg-stone-900 border border-stone-800/50 rounded-none overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#8c1d1a] to-[#bfa15f] transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-[10px] font-serif text-stone-500 mt-6 pt-4 border-t border-dashed border-stone-800/40">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Operational metrics synchronized</span>
            <span>Data logs updated 5s ago</span>
          </div>
        </div>
      )}

      {/* 2. USER MANAGEMENT DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className={`p-6 border rounded-none ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          
          {/* Filter segment */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-dashed border-stone-800/40 mb-6 gap-4">
            
            {/* Left side query inputs */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 flex-grow max-w-2xl">
              {/* Search Bar */}
              <div className="relative flex-grow">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search members by email, name, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-none text-xs border focus:outline-none focus:ring-1 focus:ring-stone-400/30 font-serif ${
                    darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                  }`}
                />
              </div>

              {/* Plan filter */}


              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`py-2 px-3 text-xs rounded-none border focus:outline-none font-serif ${
                  darkMode ? 'bg-[#121211] border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'
                }`}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Right side add actions */}
            <div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className={`px-4 py-2.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                  darkMode ? 'bg-[#bfa15f] text-black hover:opacity-90' : 'bg-[#8c1d1a] text-white hover:opacity-90'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Onboard Member
              </button>
            </div>

          </div>

          {/* Directory Grid/Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 dark:border-stone-800/60 pb-3 text-[10px] font-sans font-extrabold uppercase tracking-widest text-stone-400">
                  <th className="py-3 px-4">Member Info</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-center">Docs Processed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/40 dark:divide-stone-800/20">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center font-serif text-stone-400 italic">
                      No members matched current filter matrix inside this container.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={`hover:bg-stone-50/20 dark:hover:bg-stone-900/10 transition-all`}>
                      {/* Name/Email */}
                      <td className="py-4 px-4">
                        <div className="font-serif font-bold text-sm">{user.name}</div>
                        <div className="font-mono text-[10px] text-stone-500 mt-0.5">{user.email}</div>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 font-mono text-[10px] text-stone-400">
                        {user.joinedDate}
                      </td>

                      {/* Processed Count */}
                      <td className="py-4 px-4 text-center font-mono font-bold">
                        {user.docsProcessed.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-sans font-extrabold uppercase tracking-wide ${
                          user.status === 'active' ? 'text-emerald-500' : 'text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {user.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Suspend/Activate Toggle */}
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            title={user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                            className={`p-1.5 border hover:bg-stone-100 dark:hover:bg-stone-800 ${
                              user.status === 'active' ? 'text-amber-500 border-amber-500/10' : 'text-emerald-500 border-emerald-500/10'
                            }`}
                          >
                            {user.status === 'active' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingUser(user)}
                            title="Edit Subscription / Info"
                            className="p-1.5 border border-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-white"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Purge user */}
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            title="Delete User Account"
                            className="p-1.5 border border-stone-800/40 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}



      {/* 3. USER ACTIVITY LOGS TAB */}
      {activeSubTab === 'logs' && (
        <div className={`p-6 border rounded-none ${
          darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-dashed border-stone-800/40 mb-6 gap-4">
            <div>
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider">User Activity Directory</h4>
              <p className="text-[10px] font-serif text-stone-500 mt-1">Chronological history of operations performed by registered human users.</p>
            </div>
            
            {/* Quick search input for logs */}
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
              <input
                type="text"
                placeholder="Filter logs by email or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-1.5 rounded-none text-xs border focus:outline-none font-serif ${
                  darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                }`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 dark:border-stone-800/60 pb-3 text-[10px] font-sans font-extrabold uppercase tracking-widest text-stone-400">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/40 dark:divide-stone-800/20 font-mono text-[11px]">
                {activityLogs
                  .filter(log => 
                    (log.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (log.activityType || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center font-serif text-stone-400 italic">
                      No user activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  activityLogs
                    .filter(log => 
                      (log.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (log.activityType || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/20 dark:hover:bg-stone-900/10 transition-all">
                        <td className="py-3 px-4 font-sans text-xs font-bold">{log.userEmail || 'System'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold font-sans uppercase tracking-wider rounded-none ${
                            (log.activityType || '').includes('AUTH') || (log.activityType || '').includes('REGISTER') || (log.activityType || '').includes('LOGIN')
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : (log.activityType || '').includes('OCR') || (log.activityType || '').includes('AI')
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-[#bfa15f]/10 text-[#bfa15f] border border-[#bfa15f]/20'
                          }`}>
                            {(log.activityType || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-400 font-serif">{log.description || '-'}</td>
                        <td className="py-3 px-4 text-right text-stone-400">
                          {log.date}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. GATEWAY CONFIGURATOR & NODE SETTINGS */}
      {activeSubTab === 'gateways' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Adsterra Monetization Engine Panel */}
          <div className={`p-6 border rounded-none space-y-6 ${
            darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
          }`}>
            <div>
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider">Adsterra Monetization Engine</h4>
              <p className="text-[10px] font-serif text-stone-500 mt-1">Configure Adsterra direct link settings, toggle visual sponsored integrations, and control catalog ad placements.</p>
            </div>

            <div className="space-y-4 font-serif text-xs">
              
              {/* Adsterra Active Toggle */}
              <div className={`p-4 border rounded-none space-y-3 ${
                darkMode ? 'bg-[#121211] border-stone-800' : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 text-amber-500 bg-amber-500/15 border border-amber-500/20">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h5 className="font-sans font-extrabold uppercase tracking-wide text-[10px]">Adsterra Direct Link Placement</h5>
                      <span className="text-[9px] font-mono text-stone-400">Status: {settings.adsterraActive ? 'Active (Displaying Ads)' : 'Inactive'}</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.adsterraActive}
                      onChange={(e) => handleUpdateSettings('adsterraActive', e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-400 after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-dashed border-stone-800/40 space-y-2">
                  <label className="block text-[9px] font-sans font-extrabold uppercase tracking-widest text-stone-400">
                    Adsterra Direct Link URL / Smartlink
                  </label>
                  <input
                    type="text"
                    value={settings.adsterraDirectLink || ''}
                    onChange={(e) => handleUpdateSettings('adsterraDirectLink', e.target.value)}
                    placeholder="https://www.profitablecpmgate.com/o84mgnk2?key=..."
                    className={`w-full px-3 py-2 rounded-none text-xs border font-mono focus:outline-none ${
                      darkMode ? 'bg-[#181817] border-stone-800 text-white focus:border-amber-500/50' : 'bg-white border-stone-300 text-stone-800 focus:border-stone-800'
                    }`}
                  />
                  <span className="text-[8px] text-stone-500 block leading-normal mt-1">
                    This link is applied globally across the navigation header, dashboard sponsor card, and tool download pages.
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* System Rate Limits Card */}
          <div className={`p-6 border rounded-none space-y-6 ${
            darkMode ? 'bg-[#181817] border-stone-800' : 'bg-white border-[#e6e2d8]'
          }`}>
            <div>
              <h4 className="font-serif font-bold text-sm uppercase tracking-wider">SaaS Infrastructure Metrics</h4>
              <p className="text-[10px] font-serif text-stone-500 mt-1">Regulate system thresholds, throttling rate limits, and server maintenance modes.</p>
            </div>

            <div className="space-y-5 font-serif text-xs">
              
              {/* Rate limit input */}
              <div>
                <label className="block text-[10px] font-sans font-extrabold uppercase tracking-widest text-stone-400 mb-1.5">
                  Global API Rate Limit (Requests / min)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={settings.rateLimitPerMin}
                    onChange={(e) => handleUpdateSettings('rateLimitPerMin', parseInt(e.target.value) || 60)}
                    className={`w-32 px-3 py-2 rounded-none text-xs border font-mono ${
                      darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                    }`}
                  />
                  <span className="text-[10px] text-stone-400">Current setting yields max {settings.rateLimitPerMin * 1440} reqs/day per cluster node.</span>
                </div>
              </div>

              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-4 border border-red-500/10 bg-red-500/5 rounded-none">
                <div className="max-w-md pr-4">
                  <h5 className="font-sans font-bold text-[10px] uppercase text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Global Maintenance Mode
                  </h5>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-normal">
                    Redirects all standard document conversion pipelines to a 503 maintenance splash page immediately. Admins can bypass this override.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleUpdateSettings('maintenanceMode', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-400 after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              <div className="p-4 border border-dashed border-stone-800 dark:border-stone-800/60 rounded-none text-[10px] leading-normal text-stone-400">
                <span className="font-bold text-stone-300 block uppercase font-sans text-[8px] tracking-wider mb-1">Architecture Reference</span>
                Your client application operates using <strong className="font-sans">Wasm-compiled compilers</strong>. The server `server.ts` provides secure proxy nodes for Gemini OCR pipelines and translation models, ensuring no API credentials are exposed to the client-side browser tab.
              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- FORMS & DIALOGS MODALS --- */}

      {/* 1. EDIT USER PROFILE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setEditingUser(null)}></div>
          
          <div className={`relative w-full max-w-md rounded-none p-8 shadow-2xl border ${
            darkMode ? 'bg-[#181817] border-stone-800 text-white' : 'bg-white border-[#e6e2d8] text-stone-800'
          }`}>
            <div className="absolute top-4 right-4">
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-white font-mono text-sm">✕</button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-6">
              <div>
                <h3 className="font-serif font-medium text-lg tracking-tight">Edit Member Profile</h3>
                <p className="text-[10px] font-serif text-stone-500 mt-0.5">Modify workspace authorization levels for {editingUser.email}.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                    Member / Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-none text-xs border ${
                      darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                    }`}
                  />
                </div>



                <div>
                  <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                    className={`w-full px-3 py-2 rounded-none text-xs border ${
                      darkMode ? 'bg-[#121211] border-stone-800 text-stone-300' : 'bg-white border-stone-300 text-stone-700'
                    }`}
                  >
                    <option value="active">Active (Access Enabled)</option>
                    <option value="suspended">Suspended (Access Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-wider border ${
                    darkMode ? 'border-stone-800 hover:bg-stone-800' : 'border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-[#bfa15f] text-black hover:opacity-90' : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD USER PROFILE MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setShowAddUserModal(false)}></div>
          
          <div className={`relative w-full max-w-md rounded-none p-8 shadow-2xl border ${
            darkMode ? 'bg-[#181817] border-stone-800 text-white' : 'bg-white border-[#e6e2d8] text-stone-800'
          }`}>
            <div className="absolute top-4 right-4">
              <button onClick={() => setShowAddUserModal(false)} className="text-stone-400 hover:text-white font-mono text-sm">✕</button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-6">
              <div>
                <h3 className="font-serif font-medium text-lg tracking-tight">Onboard New Member</h3>
                <p className="text-[10px] font-serif text-stone-500 mt-0.5">Manually register a corporate or personal user thread in current container database.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="partner@editorial.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-none text-xs border ${
                      darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1.5">
                    Member Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Vance Publishing Ltd."
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-none text-xs border ${
                      darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                    }`}
                  />
                </div>


              </div>

              <div className="pt-4 border-t border-dashed border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-wider border ${
                    darkMode ? 'border-stone-800 hover:bg-stone-800' : 'border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-[#bfa15f] text-black hover:opacity-90' : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
