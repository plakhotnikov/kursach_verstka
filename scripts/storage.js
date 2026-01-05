const STORAGE_KEYS = {
  current: 'timeCoordination_currentPlayer',
  session: 'timeCoordination_lastSession',
  rating: 'timeCoordination_rating',
};

const defaultRating = {
  lamp: [],
  runner: [],
  pulse: [],
};

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
    const stored = safeParse(localStorage.getItem(STORAGE_KEYS.rating), defaultRating);
    if (Array.isArray(stored)) {
      return {
        lamp: stored,
        runner: [],
        pulse: [],
      };
    }
    return {
      ...defaultRating,
      ...stored,
    };
  },
  pushRating(levelId, entry) {
    const rating = this.getRating();
    const bucket = rating[levelId] || [];
    const enriched = { ...entry, levelId };
    bucket.push(enriched);
    bucket.sort((a, b) => b.score - a.score || a.penalty - b.penalty);
    rating[levelId] = bucket.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.rating, JSON.stringify(rating));
  },
  clearRating() {
    localStorage.removeItem(STORAGE_KEYS.rating);
  },
};
