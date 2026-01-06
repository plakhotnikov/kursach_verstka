import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const fromGame = params.get('from') === 'game';
  const session = storage.getSession();
  const rating = storage.getRating();
  renderSummary(fromGame ? session : null);
  renderRating(rating.lamp, 'rating-lamp');
  renderRating(rating.runner, 'rating-runner');
  renderRating(rating.pulse, 'rating-pulse');

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
  const summaryBlock = document.getElementById('session-summary');
  const summaryElements = {
    player: document.getElementById('summary-player'),
    score: document.getElementById('summary-score'),
    penalty: document.getElementById('summary-penalty'),
    duration: document.getElementById('summary-duration'),
    status: document.getElementById('summary-status'),
  };

  if (!session) {
    if (summaryBlock) summaryBlock.style.display = 'none';
    summaryElements.player.textContent = 'Игрок: —';
    summaryElements.score.textContent = 'Очки: 0';
    summaryElements.penalty.textContent = 'Штрафы: 0';
    summaryElements.duration.textContent = 'Затраченное время: ?';
    summaryElements.status.textContent = 'Статус: нет данных';
    renderRounds(null);
    return;
  }
  if (summaryBlock) summaryBlock.style.display = '';

  const spent = session.finishedAt
    ? Math.round((session.finishedAt - session.startedAt) / 1000)
    : 0;

  summaryElements.player.textContent = `Игрок: ${session.playerName || '—'}`;
  summaryElements.score.textContent = `Очки: ${session.totalScore}`;
  summaryElements.penalty.textContent = `Штрафы: ${session.penalties}`;
  summaryElements.duration.textContent = `Затраченное время: ${formatSeconds(spent)}`;
  const extra = session.message ? ` · ${session.message}` : '';
  const levelText = session.levelTitle ? ` · ${session.levelTitle}` : '';
  summaryElements.status.textContent = `Статус: ${statusLabel(session.status)}${levelText}${extra}`;
  renderRounds(session.levelResult?.roundsLog);
}

function renderRating(records, listId) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  if (!records || records.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'Пока нет результатов.';
    list.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const item = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = truncateText(record.name, 12);
    const right = document.createElement('span');
    right.textContent = `${record.score} очков · штраф ${record.penalty}`;
    item.append(left, right);
    list.appendChild(item);
  });
}

function renderRounds(records) {
  const list = document.getElementById('rounds-list');
  if (!list) return;
  list.innerHTML = '';
  if (!records || records.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'Нет данных по раундам.';
    list.appendChild(empty);
    return;
  }
  records.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = entry;
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

function truncateText(value, limit) {
  if (!value) return '—';
  const text = String(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(1, limit - 3))}...`;
}
