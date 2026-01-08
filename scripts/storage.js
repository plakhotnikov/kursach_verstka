const STORAGE_KEYS = {
    current: 'timeCoordination_currentPlayer',
    session: 'timeCoordination_lastSession',
    rating: 'timeCoordination_rating',
};

const defaultRating = {
    calm: [],
    steady: [],
    rush: [],
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
                calm: stored,
                steady: [],
                rush: [],
            };
        }
        return {
            ...defaultRating,
            ...stored,
        };
    },
    pushRating(difficulty, entry) {
        const rating = this.getRating();
        const bucket = rating[difficulty] || [];
        const enriched = {...entry, difficulty};
        bucket.push(enriched);
        bucket.sort((a, b) => b.score - a.score || a.penalty - b.penalty);
        rating[difficulty] = bucket.slice(0, 20);
        localStorage.setItem(STORAGE_KEYS.rating, JSON.stringify(rating));
    },
    clearRating() {
        localStorage.removeItem(STORAGE_KEYS.rating);
    },
};
