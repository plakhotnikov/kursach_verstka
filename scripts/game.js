import { storage } from './storage.js';

const player = storage.getCurrentPlayer();
if (!player) {
  window.location.replace('index.html');
}

const difficultyProfiles = {
  calm: {
    label: 'Разминка',
    globalTime: 210,
    tolerance: 900,
    penaltyFactor: 15,
    distraction: 3,
  },
  steady: {
    label: 'Стандарт',
    globalTime: 180,
    tolerance: 750,
    penaltyFactor: 20,
    distraction: 5,
  },
  rush: {
    label: 'Штурм',
    globalTime: 150,
    tolerance: 600,
    penaltyFactor: 25,
    distraction: 7,
  },
};

const levels = [
  {
    id: 'lamp',
    title: 'Импульс лампы',
    description:
      'Запоминайте задержку и останавливайте лампу клавишей Space так, чтобы попасть в момент вспышки.',
    build: createLampEngine,
  },
  {
    id: 'runner',
    title: 'Мышь и тоннель',
    description:
      'Перетащите мышь по треку в норку ровно за указанное количество секунд. Чем дальше, тем быстрее.',
    build: createRunnerEngine,
  },
  {
    id: 'pulse',
    title: 'Прыгун по таймеру',
    description:
      'Запомните интервал между вспышками и сделайте двойной клик в момент следующей.',
    build: createPulseEngine,
  },
];

const ui = {
  playerName: document.getElementById('player-name'),
  levelLabel: document.getElementById('level-label'),
  levelTitle: document.getElementById('level-title'),
  levelDescription: document.getElementById('level-description'),
  startLevelBtn: document.getElementById('start-level'),
  skipLevelBtn: document.getElementById('skip-level'),
  exitBtn: document.getElementById('exit-btn'),
  playground: document.getElementById('playground'),
  totalScore: document.getElementById('total-score'),
  penaltyScore: document.getElementById('penalty-score'),
  roundProgress: document.getElementById('round-progress'),
  timer: document.getElementById('global-timer'),
};

const profile = difficultyProfiles[player?.difficulty] || difficultyProfiles.steady;

let session = {
  playerName: player.name,
  difficulty: player.difficulty,
  totalScore: 0,
  penalties: 0,
  startedAt: Date.now(),
  levelResults: [],
  status: 'in-progress',
};

let levelIndex = -1;
let currentEngine = null;
let globalTimerId = null;
let timeLeft = profile.globalTime;

ui.playerName.textContent = `${player.name} · ${profile.label}`;
ui.levelLabel.textContent = 'Не начато';
ui.startLevelBtn.disabled = false;
ui.skipLevelBtn.disabled = true;

ui.startLevelBtn.addEventListener('click', () => {
  startNextLevel();
});

ui.skipLevelBtn.addEventListener('click', () => {
  if (!currentEngine) return;
  currentEngine.abort('Игрок остановил уровень.');
  applyPenalty(profile.penaltyFactor * 2);
  announce(`Уровень ${levels[levelIndex].title} остановлен.`);
});

ui.exitBtn.addEventListener('click', () => {
  finalizeGame('aborted', 'Игрок завершил игру досрочно.');
});

spawnFloaters(profile.distraction + 2);
startGlobalTimer();
setupBeforeUnload();

function startNextLevel() {
  if (currentEngine) return;
  levelIndex += 1;
  if (levelIndex >= levels.length) {
    finalizeGame('completed', 'Все уровни успешно завершены.');
    return;
  }

  const definition = levels[levelIndex];
  ui.levelLabel.textContent = `${levelIndex + 1} / ${levels.length}`;
  ui.levelTitle.textContent = definition.title;
  ui.levelDescription.textContent = definition.description;
  ui.startLevelBtn.disabled = true;
  ui.skipLevelBtn.disabled = false;
  ui.roundProgress.style.width = '0%';
  ui.playground.innerHTML = '';
  spawnFloaters(profile.distraction);

  const context = {
    playground: ui.playground,
    profile,
    onScore,
    onPenalty: applyPenalty,
    onRoundProgress: updateProgress,
    onComplete: handleLevelComplete,
    levelIndex,
    announce,
  };

  currentEngine = definition.build(context);
}

function updateProgress(done, total) {
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  ui.roundProgress.style.width = `${percent}%`;
}

function onScore(points) {
  const awarded = Math.max(0, Math.round(points));
  session.totalScore += awarded;
  ui.totalScore.textContent = session.totalScore;
  return awarded;
}

function applyPenalty(value) {
  const penalty = Math.max(0, Math.round(value));
  session.penalties += penalty;
  ui.penaltyScore.textContent = session.penalties;
  session.totalScore = Math.max(0, session.totalScore - Math.round(penalty / 2));
  ui.totalScore.textContent = session.totalScore;
  return penalty;
}

function handleLevelComplete(result) {
  session.levelResults[levelIndex] = result;
  if (result.success) {
    announce(`Уровень «${levels[levelIndex].title}» пройден.`);
    currentEngine = null;
    ui.startLevelBtn.disabled = false;
    ui.startLevelBtn.textContent =
      levelIndex + 1 >= levels.length ? 'Завершить!' : 'Следующий уровень';
    ui.skipLevelBtn.disabled = true;
    if (levelIndex + 1 >= levels.length) {
      finalizeGame('completed', 'Все уровни пройдены.');
    }
  } else {
    if (result.score) {
      session.totalScore = Math.max(0, session.totalScore - result.score);
      ui.totalScore.textContent = session.totalScore;
    }
    announce(`Недостаточно очков на уровне «${levels[levelIndex].title}». Попробуйте снова.`);
    currentEngine = null;
    ui.startLevelBtn.disabled = false;
    ui.skipLevelBtn.disabled = true;
    ui.startLevelBtn.textContent = 'Повторить уровень';
    levelIndex -= 1;
  }
}

function startGlobalTimer() {
  updateGlobalTimer();
  globalTimerId = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      clearInterval(globalTimerId);
      ui.timer.textContent = '00:00';
      finalizeGame('timeout', 'Общий таймер истёк.');
    } else {
      updateGlobalTimer();
    }
  }, 1000);
}

function updateGlobalTimer() {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  ui.timer.textContent = `${minutes}:${seconds}`;
}

function finalizeGame(status, message) {
  if (session.status !== 'in-progress') return;
  clearInterval(globalTimerId);
  session.status = status;
  session.finishedAt = Date.now();
  session.message = message;
  storage.saveSession(session);
  if (status === 'completed') {
    storage.pushRating({
      name: session.playerName,
      score: session.totalScore,
      penalty: session.penalties,
      duration: Math.round((session.finishedAt - session.startedAt) / 1000),
      date: new Date().toISOString(),
    });
  }
  window.location.href = 'leaderboard.html';
}

function announce(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 50);
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

function spawnFloaters(count) {
  const template = document.getElementById('floating-template');
  if (!template) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const floater = template.content.firstElementChild.cloneNode(true);
    floater.style.left = `${Math.random() * 90 + 5}%`;
    floater.style.top = `${Math.random() * 90 + 5}%`;
    floater.style.animationDuration = `${4 + Math.random() * 4}s`;
    fragment.appendChild(floater);
  }
  ui.playground.appendChild(fragment);
}

function setupBeforeUnload() {
  window.addEventListener('beforeunload', () => {
    if (session.status === 'in-progress') {
      storage.saveSession({ ...session, status: 'aborted' });
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatMs(ms) {
  return (ms / 1000).toFixed(2);
}

function buildRoundLog(container) {
  const log = document.createElement('div');
  log.className = 'round-log';
  container.appendChild(log);
  return {
    push(entry) {
      const p = document.createElement('p');
      p.textContent = entry;
      log.prepend(p);
    },
  };
}

function createLampEngine(context) {
  const { playground, profile, onScore, onPenalty, onRoundProgress, onComplete } = context;
  const rounds = randomInt(3, 5);
  onRoundProgress(0, rounds);
  let completed = 0;
  let levelScore = 0;
  let levelPenalty = 0;
  let active = false;
  let targetDelay = 0;
  let startStamp = 0;
  let bulbTimeout;
  let failTimeout;
  const board = document.createElement('div');
  board.className = 'lamp-board';
  const lamp = document.createElement('div');
  lamp.className = 'lamp';
  const bulb = document.createElement('div');
  bulb.className = 'lamp__bulb';
  const hint = document.createElement('p');
  hint.className = 'hint';
  const target = document.createElement('p');
  target.className = 'lamp__target';
  target.textContent = '—';
  const button = document.createElement('button');
  button.textContent = 'Запустить попытку';
  button.className = 'primary';
  const log = buildRoundLog(lamp);

  lamp.append(bulb, hint, target, button);
  board.appendChild(lamp);
  playground.appendChild(board);

  hint.textContent = 'Запустите попытку, дождитесь вспышки и жмите пробел.';

  function startRound() {
    if (active) return;
    active = true;
    targetDelay = randomBetween(1500, 3500);
    startStamp = performance.now();
    hint.textContent = 'Сфокусируйтесь. Вспышка будет скоро.';
    target.textContent = `${(targetDelay / 1000).toFixed(2)} c`;
    bulb.classList.remove('active');
    bulbTimeout = setTimeout(() => {
      bulb.classList.add('active');
      setTimeout(() => bulb.classList.remove('active'), 800);
    }, targetDelay);
    document.addEventListener('keydown', handlePress);
    failTimeout = setTimeout(() => {
      if (active) {
        concludeRound(startStamp + targetDelay + profile.tolerance);
      }
    }, targetDelay + profile.tolerance * 2);
  }

  function handlePress(event) {
    if (event.code !== 'Space' || !active) return;
    event.preventDefault();
    concludeRound(performance.now());
  }

  function concludeRound(stamp) {
    active = false;
    document.removeEventListener('keydown', handlePress);
    clearTimeout(bulbTimeout);
    clearTimeout(failTimeout);
    const elapsed = stamp - startStamp;
    const diff = Math.abs(elapsed - targetDelay);
    const allowed = profile.tolerance;
    const precision = Math.max(0, 1 - diff / (allowed * 2));
    const score = Math.round(precision * 120);
    const penalty = elapsed < targetDelay * 0.6 ? profile.penaltyFactor : 0;
    if (penalty) {
      levelPenalty += onPenalty(penalty);
    }
    levelScore += onScore(score);
    completed += 1;
    onRoundProgress(completed, rounds);
    log.push(
      `Раунд ${completed}: промах ${formatMs(diff)} c, очки ${score}${penalty ? `, штраф ${penalty}` : ''}`,
    );
    if (completed >= rounds) {
      finishLevel();
    }
  }

  button.addEventListener('click', startRound);

  function finishLevel() {
    const average = completed ? levelScore / completed : 0;
    const success = completed === rounds && average >= 60;
    onComplete({
      id: 'lamp',
      score: levelScore,
      penalty: levelPenalty,
      success,
      rounds,
      completed,
    });
  }

  return {
    abort(reason) {
      document.removeEventListener('keydown', handlePress);
      clearTimeout(bulbTimeout);
      clearTimeout(failTimeout);
      log.push(`Рунд остановлен: ${reason}`);
      onComplete({
        id: 'lamp',
        success: false,
        score: levelScore,
        penalty: levelPenalty,
        rounds,
        completed,
      });
    },
  };
}

function createRunnerEngine(context) {
  const { playground, profile, onScore, onPenalty, onRoundProgress, onComplete, announce } = context;
  const rounds = randomInt(3, 5);
  onRoundProgress(0, rounds);
  let completed = 0;
  let levelScore = 0;
  let levelPenalty = 0;
  const track = document.createElement('div');
  track.className = 'track';
  const trackLine = document.createElement('div');
  trackLine.className = 'track__line';
  const runner = document.createElement('div');
  runner.className = 'runner';
  runner.textContent = '🐭';
  const goal = document.createElement('div');
  goal.className = 'goal';
  const hint = document.createElement('p');
  hint.className = 'hint';
  const button = document.createElement('button');
  button.textContent = 'Подготовить забег';
  button.className = 'primary';
  const log = buildRoundLog(playground);

  playground.append(hint, button, track);
  track.append(trackLine, runner, goal);

  let dragging = false;
  let targetDelay = 0;
  let startStamp = 0;
  let ready = false;

  function prepareRound() {
    if (dragging) return;
    ready = true;
    targetDelay = randomBetween(2000, 4500) * (profile === difficultyProfiles.rush ? 0.8 : 1);
    hint.textContent = `Держите мышь ${formatMs(targetDelay)} c и бросьте в норку.`;
    positionRunner(0.1);
    positionGoal(Math.random() * 0.6 + 0.3);
  }

  function positionRunner(progress) {
    const lineWidth = track.clientWidth - 60;
    const x = 30 + progress * lineWidth;
    runner.style.left = `${x}px`;
    runner.style.top = `${50 + Math.sin(progress * Math.PI) * 30}%`;
  }

  function positionGoal(progress) {
    const width = track.clientWidth - 70;
    const x = 35 + progress * width;
    const yOffset = randomBetween(-20, 20);
    goal.style.left = `${x}px`;
    goal.style.top = `calc(50% + ${yOffset}px)`;
  }

  runner.addEventListener('pointerdown', (event) => {
    if (!ready) return;
    event.preventDefault(); // отключаем выделение текста при перетаскивании
    dragging = true;
    runner.classList.add('dragging');
    runner.setPointerCapture(event.pointerId);
    startStamp = performance.now();
  });

  runner.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = track.getBoundingClientRect();
    const relX = clamp(event.clientX - rect.left, 30, rect.width - 30);
    const relY = clamp(event.clientY - rect.top, 20, rect.height - 20);
    runner.style.left = `${relX}px`;
    runner.style.top = `${relY}px`;
  });

  runner.addEventListener('pointerup', (event) => {
    if (!dragging) return;
    dragging = false;
    ready = false;
    runner.classList.remove('dragging');
    runner.releasePointerCapture(event.pointerId);
    concludeRun();
  });

  function concludeRun() {
    const endStamp = performance.now();
    const duration = endStamp - startStamp;
    const rectRunner = runner.getBoundingClientRect();
    const rectGoal = goal.getBoundingClientRect();
    const dist = Math.hypot(
      rectRunner.left - rectGoal.left,
      rectRunner.top - rectGoal.top,
    );
    const withinGoal = dist < 60;
    const diff = Math.abs(duration - targetDelay);
    const precision = withinGoal ? Math.max(0, 1 - diff / (profile.tolerance * 1.5)) : 0;
    const score = Math.round(precision * 150);
    if (!withinGoal) {
      levelPenalty += onPenalty(profile.penaltyFactor);
    }
    levelScore += onScore(score);
    completed += 1;
    onRoundProgress(completed, rounds);
    log.push(
      `Забег ${completed}: ${withinGoal ? 'достигнута норка' : 'промах по траектории'}, промах ${formatMs(
        diff,
      )} c, очки ${score}`,
    );
    if (completed >= rounds) {
      const average = levelScore / rounds;
      const success = completed === rounds && average >= 65;
      onComplete({ id: 'runner', success, rounds, completed, score: levelScore, penalty: levelPenalty });
    } else {
      prepareRound();
    }
  }

  button.addEventListener('click', () => {
    prepareRound();
    announce('Норка сменила позицию!');
  });

  prepareRound();

  return {
    abort(reason) {
      dragging = false;
      log.push(`Забег отменён: ${reason}`);
      onComplete({ id: 'runner', success: false, rounds, completed, score: levelScore, penalty: levelPenalty });
    },
  };
}

function createPulseEngine(context) {
  const { playground, profile, onScore, onPenalty, onRoundProgress, onComplete } = context;
  const rounds = randomInt(3, 5);
  onRoundProgress(0, rounds);
  let completed = 0;
  let levelScore = 0;
  let levelPenalty = 0;
  let waitingClick = false;
  let expectedStamp = 0;
  const info = document.createElement('p');
  info.className = 'hint';
  const button = document.createElement('button');
  button.textContent = 'Показать интервалы';
  button.className = 'primary';
  const zone = document.createElement('div');
  zone.className = 'jump-zone';
  const target = document.createElement('div');
  target.className = 'pulse-target';
  const log = buildRoundLog(playground);

  zone.append(target);
  playground.append(info, button, zone);

  info.textContent = 'Наблюдайте за вспышками, затем двойной клик.';

  button.addEventListener('click', () => {
    if (waitingClick) return;
    startPulse();
  });

  target.addEventListener('dblclick', () => {
    if (!waitingClick) {
      levelPenalty += onPenalty(profile.penaltyFactor / 2);
      log.push('Двойной клик слишком рано.');
      return;
    }
    waitingClick = false;
    const diff = Math.abs(performance.now() - expectedStamp);
    const score = Math.round(Math.max(0, 1 - diff / (profile.tolerance * 1.2)) * 180);
    levelScore += onScore(score);
    target.classList.add('active');
    setTimeout(() => target.classList.remove('active'), 600);
    info.textContent = `Промах ${formatMs(diff)} c · очки ${score}`;
    completed += 1;
    onRoundProgress(completed, rounds);
    log.push(`Прыжок ${completed}: промах ${formatMs(diff)} c, очки ${score}`);
    if (completed >= rounds) {
      const average = levelScore / rounds;
      const success = completed === rounds && average >= 70;
      onComplete({ id: 'pulse', success, rounds, completed, score: levelScore, penalty: levelPenalty });
    } else {
      startPulse();
    }
  });

  function startPulse() {
    waitingClick = false;
    target.classList.remove('active');
    const delay = randomBetween(1200, 2600);
    const width = Math.max(160, zone.clientWidth - 140);
    const height = Math.max(160, zone.clientHeight - 140);
    target.style.left = `${randomBetween(0, width)}px`;
    target.style.top = `${randomBetween(0, height)}px`;
    info.textContent = 'Слушайте ритм: две вспышки задают интервал.';
    target.classList.add('active');
    setTimeout(() => target.classList.remove('active'), 450);
    setTimeout(() => {
      target.classList.add('active');
      setTimeout(() => target.classList.remove('active'), 450);
      waitingClick = true;
      expectedStamp = performance.now() + delay;
       info.textContent = 'Предскажите следующий всплеск и сделайте двойной клик.';
    }, delay);
  }

  return {
    abort(reason) {
      waitingClick = false;
      log.push(`Серия остановлена: ${reason}`);
      onComplete({ id: 'pulse', success: false, rounds, completed, score: levelScore, penalty: levelPenalty });
    },
  };
}
