import {storage} from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('start-form');
    const existing = storage.getCurrentPlayer();

  if (existing) {
    form.playerName.value = existing.name;
    form.difficulty.value = existing.difficulty || 'steady';
  }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
    const payload = {
      name: formData.get('playerName').trim(),
      difficulty: formData.get('difficulty'),
      createdAt: Date.now(),
    };

        storage.saveCurrentPlayer(payload);
        storage.saveSession(null);
        window.location.href = 'game.html';
    });
});
