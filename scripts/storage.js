const STORAGE_KEYS = {
  current: 'timeCoordination_currentPlayer',
  session: 'timeCoordination_lastSession',
  rating: 'timeCoordination_rating',
};

const defaultRating = [];

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn('Не удалось распарсить данные', error);
    return fallback;
  }
};

export const storage = {
  saveCurrentPlayer(payload) {
    localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(payload));
  },
  getCurrentPlayer() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.current), null);
  },
  clearCurrentPlayer() {
    localStorage.removeItem(STORAGE_KEYS.current);
  },
  saveSession(payload) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(payload));
  },
  getSession() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.session), null);
  },
  getRating() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.rating), defaultRating);
  },
  pushRating(entry) {
    const rating = this.getRating();
    rating.push(entry);
    rating.sort((a, b) => b.score - a.score || a.penalty - b.penalty);
    const trimmed = rating.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.rating, JSON.stringify(trimmed));
  },
  clearRating() {
    localStorage.removeItem(STORAGE_KEYS.rating);
  },
};
