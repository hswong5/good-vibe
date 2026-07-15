const assert = require('assert');
const path = require('path');

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

global.localStorage = new MemoryStorage();

const AccountStore = require(path.join(__dirname, '..', 'account-store.js'));

const quote = { category: 'Calm', quote: 'Breathe deeply.', author: 'Maya' };

function reset() {
  global.localStorage.clear();
}

(function runTests() {
  reset();
  const account = AccountStore.saveAccount({ name: 'Ava', email: 'ava@example.com' });
  assert.strictEqual(account.name, 'Ava');
  assert.deepStrictEqual(AccountStore.getActiveAccount(), account);

  const toggled = AccountStore.toggleFavorite(account, quote);
  assert.strictEqual(toggled.favorites.length, 1);
  assert.strictEqual(toggled.favorites[0].quote, quote.quote);

  const toggledAgain = AccountStore.toggleFavorite(account, quote);
  assert.strictEqual(toggledAgain.favorites.length, 0);

  console.log('account-store tests passed');
})();
