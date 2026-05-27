const SETTINGS_KEY = 'speakeasy_settings_v1';
const SESSIONS_KEY = 'speakeasy_sessions_v1';
const QUESTION_BANK_KEY = 'speakeasy_question_bank_v1';

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
