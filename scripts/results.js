import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const session = storage.getSession();
  const rating = storage.getRating();
  renderSummary(session);
  renderRating(rating);

  document.getElementById('restart-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  document.getElementById('clear-rating').addEventListener('click', () => {
    if (confirm('Удалить все результаты?')) {
      storage.clearRating();
      renderRating([]);
    }
  });
});

function renderSummary(session) {
  const summaryElements = {
    player: document.getElementById('summary-player'),
    score: document.getElementById('summary-score'),
    penalty: document.getElementById('summary-penalty'),
    duration: document.getElementById('summary-duration'),
    status: document.getElementById('summary-status'),
  };

  if (!session) {
    summaryElements.player.textContent = 'Игрок: —';
    summaryElements.score.textContent = 'Очки: 0';
    summaryElements.penalty.textContent = 'Штрафы: 0';
    summaryElements.duration.textContent = 'Затраченное время: ?';
    summaryElements.status.textContent = 'Статус: нет данных';
    return;
  }

  const spent = session.finishedAt
    ? Math.round((session.finishedAt - session.startedAt) / 1000)
    : 0;

  summaryElements.player.textContent = `Игрок: ${session.playerName || '—'}`;
  summaryElements.score.textContent = `Очки: ${session.totalScore}`;
  summaryElements.penalty.textContent = `Штрафы: ${session.penalties}`;
  summaryElements.duration.textContent = `Затраченное время: ${formatSeconds(spent)}`;
  const extra = session.message ? ` · ${session.message}` : '';
  summaryElements.status.textContent = `Статус: ${statusLabel(session.status)}${extra}`;
}

function renderRating(records) {
  const list = document.getElementById('rating-list');
  list.innerHTML = '';
  if (!records || records.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'Пока нет результатов. Пройдите игру!';
    list.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const item = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = `${record.name}`;
    const right = document.createElement('span');
    right.textContent = `${record.score} очков · штраф ${record.penalty}`;
    item.append(left, right);
    list.appendChild(item);
  });
}

function formatSeconds(value) {
  const minutes = String(Math.floor(value / 60)).padStart(2, '0');
  const seconds = String(value % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function statusLabel(status) {
  switch (status) {
    case 'completed':
      return 'победа';
    case 'timeout':
      return 'время вышло';
    case 'aborted':
      return 'остановлено';
    default:
      return status || '—';
  }
}
