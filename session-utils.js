// session-utils.js — validated session writes for journal & meditate

const VALID_MOODS = ['calm', 'grateful', 'focused', 'tired', 'anxious'];
const MAX_NOTE_LEN = 1000;
const SESSION_KEY  = 'gv_sessions';
const MAX_LOCAL    = 200; // cap stored sessions to avoid quota blow-up

/**
 * Validates and normalises a raw session object.
 * Throws a descriptive Error if required fields are invalid.
 */
function validateSession(raw) {
  const mins = Number(raw.duration_mins);
  if (!Number.isFinite(mins) || mins < 1 || mins > 120) {
    throw new Error(`duration_mins must be 1–120, got: ${raw.duration_mins}`);
  }
  if (raw.mood !== null && raw.mood !== undefined && !VALID_MOODS.includes(raw.mood)) {
    throw new Error(`Invalid mood: ${raw.mood}. Valid: ${VALID_MOODS.join(', ')}`);
  }
  const note = raw.note ? String(raw.note).trim().slice(0, MAX_NOTE_LEN) : null;
  return {
    id:            raw.id || crypto.randomUUID(),
    date:          raw.date || new Date().toISOString(),
    duration_mins: Math.round(mins),
    mood:          raw.mood || null,
    note:          note || null,
    synced:        false,
  };
}

/**
 * Saves a session to localStorage (with quota guard) and
 * attempts a Supabase write, marking synced:true on success.
 * Returns the saved session object.
 */
async function saveSession(raw, supabaseClient) {
  const session = validateSession(raw); // throws if invalid

  // ── localStorage write (quota-safe) ──────────────────────
  let sessions = [];
  try {
    sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
  } catch (_) { sessions = []; }

  sessions.unshift(session);
  if (sessions.length > MAX_LOCAL) sessions = sessions.slice(0, MAX_LOCAL);

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch (e) {
    // localStorage full — trim aggressively and retry once
    sessions = sessions.slice(0, 50);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    } catch (_) {
      console.warn('[GoodVibe] localStorage full — session saved to Supabase only');
    }
  }

  // ── Supabase write (non-blocking, marks synced) ───────────
  if (supabaseClient) {
    try {
      await supabaseClient.from('sessions').insert(session);
      session.synced = true;
      // update synced flag in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
        const idx = stored.findIndex(s => s.id === session.id);
        if (idx !== -1) { stored[idx].synced = true; localStorage.setItem(SESSION_KEY, JSON.stringify(stored)); }
      } catch (_) {}
    } catch (e) {
      console.warn('[GoodVibe] Supabase write failed — will retry on next sync', e);
      // session remains in localStorage with synced:false for future retry
    }
  }

  return session;
}

// Offline banner — shown when navigator.onLine is false
(function initOfflineBanner() {
  function setBanner(offline) {
    let banner = document.getElementById('gv-offline-banner');
    if (offline && !banner) {
      banner = document.createElement('div');
      banner.id = 'gv-offline-banner';
      banner.textContent = 'You are offline — changes will sync when reconnected.';
      Object.assign(banner.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0',
        background: 'var(--color-accent)', color: '#111',
        textAlign: 'center', padding: '.6rem 1rem',
        fontSize: '.85rem', fontWeight: '600', zIndex: '9999',
      });
      document.body.appendChild(banner);
    } else if (!offline && banner) {
      banner.remove();
    }
  }
  window.addEventListener('online',  () => setBanner(false));
  window.addEventListener('offline', () => setBanner(true));
  if (!navigator.onLine) setBanner(true);
})();
