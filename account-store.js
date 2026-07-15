(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AccountStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'goodvibe_account_store';
  const REMOTE_CONFIG_KEY = 'goodvibe_remote_config';
  const REMOTE_TABLE = 'goodvibe_accounts';

  function safeStorage() {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        return globalThis.localStorage;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function readStore() {
    const storage = safeStorage();
    if (!storage) return { accounts: [], activeAccountId: null };
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { accounts: [], activeAccountId: null };
      const parsed = JSON.parse(raw);
      return {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        activeAccountId: parsed.activeAccountId || null,
      };
    } catch (e) {
      return { accounts: [], activeAccountId: null };
    }
  }

  function writeStore(state) {
    const storage = safeStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getRemoteConfig() {
    const storage = safeStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(REMOTE_CONFIG_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.url || !parsed.anonKey) return null;
      return { url: parsed.url, anonKey: parsed.anonKey, tableName: parsed.tableName || REMOTE_TABLE };
    } catch (e) {
      return null;
    }
  }

  function configureRemote({ url, anonKey, tableName }) {
    const storage = safeStorage();
    if (!storage) return null;
    const normalized = {
      url: (url || '').trim().replace(/\/$/, ''),
      anonKey: (anonKey || '').trim(),
      tableName: (tableName || REMOTE_TABLE).trim(),
    };
    if (!normalized.url || !normalized.anonKey) {
      storage.removeItem(REMOTE_CONFIG_KEY);
      return null;
    }
    storage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async function syncAccount(account) {
    const config = getRemoteConfig();
    if (!config) return null;
    try {
      const payload = {
        id: account.id,
        name: account.name,
        email: account.email,
        favorites: account.favorites || [],
        created_at: new Date(account.createdAt || Date.now()).toISOString(),
      };
      const res = await fetch(`${config.url}/rest/v1/${config.tableName}?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify([payload]),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (e) {
      return null;
    }
  }

  function saveAccount({ name, email }) {
    const storage = safeStorage();
    if (!storage) return null;
    const state = readStore();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const account = {
      id: `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: (name || 'Guest').trim() || 'Guest',
      email: normalizedEmail || `${Date.now()}@local.goodvibe`,
      favorites: [],
      createdAt: Date.now(),
    };
    state.accounts = state.accounts.filter(existing => existing.email !== normalizedEmail || existing.id === account.id);
    state.accounts.push(account);
    state.activeAccountId = account.id;
    writeStore(state);
    syncAccount(account).catch(() => {});
    return account;
  }

  function getActiveAccount() {
    const state = readStore();
    if (!state.activeAccountId) return null;
    return state.accounts.find(account => account.id === state.activeAccountId) || null;
  }

  function setActiveAccount(accountId) {
    const state = readStore();
    const account = state.accounts.find(item => item.id === accountId);
    if (!account) return null;
    state.activeAccountId = account.id;
    writeStore(state);
    return account;
  }

  function toggleFavorite(account, quote) {
    const state = readStore();
    const existing = state.accounts.find(item => item.id === account.id);
    if (!existing) return account;
    const normalizedQuote = {
      id: quote.id || `${quote.category || 'quote'}-${quote.quote || ''}`,
      quote: quote.quote || '',
      author: quote.author || '',
      category: quote.category || 'All',
      keywords: quote.keywords || [],
    };
    const hasFavorite = existing.favorites.some(item => item.id === normalizedQuote.id);
    existing.favorites = hasFavorite
      ? existing.favorites.filter(item => item.id !== normalizedQuote.id)
      : [...existing.favorites, normalizedQuote];
    writeStore(state);
    syncAccount(existing).catch(() => {});
    return existing;
  }

  function getFavorites(account) {
    const state = readStore();
    const existing = state.accounts.find(item => item.id === account.id);
    return existing ? existing.favorites : [];
  }

  function ensureGuestAccount() {
    const active = getActiveAccount();
    if (active) return active;
    return saveAccount({ name: 'Guest', email: `guest-${Date.now()}@local.goodvibe` });
  }

  return {
    saveAccount,
    getActiveAccount,
    setActiveAccount,
    toggleFavorite,
    getFavorites,
    ensureGuestAccount,
    getRemoteConfig,
    configureRemote,
    syncAccount,
  };
});
