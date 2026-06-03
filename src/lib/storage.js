const SETTINGS_KEY = 'speakeasy_settings_v1';
const SESSIONS_KEY = 'speakeasy_sessions_v1';
const QUESTION_BANK_KEY = 'speakeasy_question_bank_v1';
const RECENT_PART1_KEY = 'speakeasy_recent_part1_v1';
const FAVORITES_KEY = 'speakeasy_favorites_v1';

export const defaultSettings = {
  part2PrepSeconds: 60,
  part2AnswerSeconds: 120,
  autoStopSeconds: 15,
  showAnswerDuringPractice: true,
  apiBaseUrl: '',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
};

export function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...defaultSettings, ...settings }));
}

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getSession(id) {
  return getSessions().find((session) => session.id === id) || null;
}

export function saveSession(session) {
  const sessions = getSessions();
  const existing = sessions.findIndex((item) => item.id === session.id);
  if (existing >= 0) sessions[existing] = session;
  else sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function clearSessions() {
  localStorage.removeItem(SESSIONS_KEY);
}

export function getStoredQuestionBank(defaultBank) {
  try {
    const raw = localStorage.getItem(QUESTION_BANK_KEY);
    return raw ? JSON.parse(raw) : structuredClone(defaultBank);
  } catch {
    return structuredClone(defaultBank);
  }
}

export function saveQuestionBank(bank) {
  localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(bank));
}

export function resetQuestionBank() {
  localStorage.removeItem(QUESTION_BANK_KEY);
}

export function getRecentPart1Questions() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PART1_KEY) || '[]');
  } catch {
    return [];
  }
}

export function rememberPart1Questions(questions, limit = 40) {
  const ids = questions.map((question) => question.sourceId || question.id || question.question || question.en).filter(Boolean);
  if (!ids.length) return;
  const recent = getRecentPart1Questions().filter((id) => !ids.includes(id));
  localStorage.setItem(RECENT_PART1_KEY, JSON.stringify([...ids, ...recent].slice(0, limit)));
}

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveFavorite(favorite) {
  const favorites = getFavorites();
  const key = favorite.key || buildFavoriteKey(favorite);
  const existing = favorites.findIndex((item) => item.key === key);
  const next = {
    ...favorite,
    key,
    id: favorite.id || favorites[existing]?.id || createId('favorite'),
    createdAt: favorites[existing]?.createdAt || favorite.createdAt || new Date().toISOString(),
  };
  if (existing >= 0) favorites[existing] = next;
  else favorites.unshift(next);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  notifyFavoritesChanged();
  return next;
}

export function removeFavorite(key) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(getFavorites().filter((item) => item.key !== key)));
  notifyFavoritesChanged();
}

export function isFavoriteKey(key) {
  return getFavorites().some((item) => item.key === key);
}

export function buildFavoriteKey(item) {
  return `${item.part || 'part1'}:${item.question || ''}:${(item.prompts || []).join('|')}`;
}

function notifyFavoritesChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('speakeasy:favorites'));
}
