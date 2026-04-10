export const AUTH_TOKEN_KEY = 'auth_token';
const LEGACY_TOKEN_KEYS = ['serviceToken', 'token'];

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and keep runtime stable.
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures and keep runtime stable.
  }
}

function migrateLegacyToken() {
  for (const legacyKey of LEGACY_TOKEN_KEYS) {
    const legacyToken = safeGet(legacyKey);
    if (!legacyToken) {
      continue;
    }

    safeSet(AUTH_TOKEN_KEY, legacyToken);

    for (const key of LEGACY_TOKEN_KEYS) {
      safeRemove(key);
    }

    return legacyToken;
  }

  return null;
}

export function getToken() {
  return safeGet(AUTH_TOKEN_KEY) || migrateLegacyToken();
}

export function setToken(token) {
  if (!token) {
    clearToken();
    return;
  }

  safeSet(AUTH_TOKEN_KEY, token);

  for (const legacyKey of LEGACY_TOKEN_KEYS) {
    safeRemove(legacyKey);
  }
}

export function clearToken() {
  safeRemove(AUTH_TOKEN_KEY);

  for (const legacyKey of LEGACY_TOKEN_KEYS) {
    safeRemove(legacyKey);
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

const authService = {
  AUTH_TOKEN_KEY,
  getToken,
  setToken,
  clearToken,
  isAuthenticated
};

export default authService;