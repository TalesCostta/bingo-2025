(() => {
  const qs = new URLSearchParams(window.location.search);
  const isHost = qs.get('host') === '1';
  const urlEvent = (qs.get('event') || '').trim();
  const urlFree = '1'; // free sempre ativo para participantes

  const participantView = document.getElementById('participantView');
  const hostView = document.getElementById('hostView');
  const eventNameEl = document.getElementById('eventName');
  const cardIdEl = document.getElementById('cardId');
  const boardEl = document.getElementById('board');
  const feedbackEl = document.getElementById('feedback');
  const markCountEl = document.getElementById('markCount');
  const lockStateEl = document.getElementById('lockState');
  const missingEventNotice = document.getElementById('missingEventNotice');
  const manualEventInput = document.getElementById('manualEvent');
  const applyEventBtn = document.getElementById('applyEvent');
  const checkBingoBtn = document.getElementById('checkBingo');
  const copyIdBtn = document.getElementById('copyId');
  const hostEventSeed = document.getElementById('hostEventSeed');
  const hostGenerate = document.getElementById('hostGenerate');
  const hostResult = document.getElementById('hostResult');
  const hostLink = document.getElementById('hostLink');
  const copyLinkBtn = document.getElementById('copyLink');
  const qrArea = document.getElementById('qrArea');
  const confettiEl = document.getElementById('confetti');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STORAGE_KEY = 'bingo2025_state';
  const FREE_INDEX = 12;
  let state = null;
  let activeEvent = '';

  const setControlsEnabled = (enabled) => {
    if (checkBingoBtn) checkBingoBtn.disabled = !enabled;
  };

  const showFeedback = (msg, celebrate = false) => {
    feedbackEl.textContent = msg || '';
    feedbackEl.classList.toggle('celebrate', celebrate);
  };

  const loadStore = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { events: {}, lastEvent: '' };
    } catch (e) {
      return { events: {}, lastEvent: '' };
    }
  };

  const saveStore = (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  };

  const saveState = () => {
    const store = loadStore();
    store.events[activeEvent] = state;
    store.lastEvent = activeEvent;
    saveStore(store);
  };

  const randomId = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const shortId = (seedStr) => {
    const hash = cyrb128(seedStr)[0];
    return Math.abs(hash).toString(36).slice(0, 6).toUpperCase();
  };

  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, h2, h3, h4];
  }

  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  const createRng = (seed) => {
    const [a, b, c, d] = cyrb128(seed);
    return sfc32(a, b, c, d);
  };

  const pickNumbers = (start, end, count, rng) => {
    const pool = [];
    for (let i = start; i <= end; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  };

  const generateBoard = (seed, freeEnabled) => {
    const rng = createRng(seed);
    const ranges = [
      { start: 1, end: 15 },
      { start: 16, end: 30 },
      { start: 31, end: 45 },
      { start: 46, end: 60 },
      { start: 61, end: 75 },
    ];
    const board = Array(25).fill(null);
    ranges.forEach((range, col) => {
      const need = freeEnabled && col === 2 ? 4 : 5;
      const numbers = pickNumbers(range.start, range.end, need, rng);
      let cursor = 0;
      for (let row = 0; row < 5; row++) {
        const idx = row * 5 + col;
        if (freeEnabled && idx === FREE_INDEX) {
          board[idx] = 'FREE';
        } else {
          board[idx] = numbers[cursor++];
        }
      }
    });
    return board;
  };

  const initMarks = (freeEnabled) => {
    const marks = Array(25).fill(false);
    if (freeEnabled) marks[FREE_INDEX] = true;
    return marks;
  };

  const loadStateForEvent = (eventSeed) => {
    const store = loadStore();
    const stored = store.events[eventSeed];
    const freeEnabled = true;
    if (stored) {
      const needsNewBoard = stored.freeEnabled !== freeEnabled || !stored.board;
      const board = needsNewBoard ? generateBoard(eventSeed + stored.playerId + (freeEnabled ? 'free' : 'nofree'), freeEnabled) : stored.board;
      const marks = Array.isArray(stored.marks) ? stored.marks.slice(0, 25).concat(Array(25).fill(false)).slice(0, 25) : initMarks(freeEnabled);
      if (freeEnabled) marks[FREE_INDEX] = true;
      return {
        ...stored,
        freeEnabled,
        board,
        marks,
      };
    }
    const playerId = randomId();
    const board = generateBoard(eventSeed + playerId + (freeEnabled ? 'free' : 'nofree'), freeEnabled);
    return {
      event: eventSeed,
      playerId,
      board,
      marks: initMarks(freeEnabled),
      freeEnabled,
    };
  };

  const updateHeader = () => {
    eventNameEl.textContent = activeEvent || '—';
    cardIdEl.textContent = state ? shortId(activeEvent + state.playerId) : '—';
  };

  const renderBoard = () => {
    boardEl.innerHTML = '';
    state.board.forEach((value, index) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.index = index;
      cell.textContent = value === 'FREE' ? 'Feliz 2026' : value;
      if (state.marks[index]) cell.classList.add('marked');
      if (value === 'FREE') cell.classList.add('free');
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-pressed', state.marks[index]);
      boardEl.appendChild(cell);
    });
    updateMarkCount();
  };

  const updateMarkCount = () => {
    const total = state.marks.filter(Boolean).length;
    markCountEl.textContent = `Marcados: ${total}/25`;
  };

  const persistAndPaint = () => {
    saveState();
    updateHeader();
    renderBoard();
  };

  const setEvent = (eventSeed) => {
    activeEvent = eventSeed;
    state = loadStateForEvent(activeEvent);
    persistAndPaint();
  };

  const toggleMark = (idx) => {
    if (state.freeEnabled && idx === FREE_INDEX) {
      state.marks[FREE_INDEX] = true;
      saveState();
      updateMarkCount();
      renderBoard();
      return;
    }
    state.marks[idx] = !state.marks[idx];
    updateMarkCount();
    saveState();
    renderBoard();
  };

  // Detecta bingo por linha, coluna ou cartela cheia
  const detectBingo = () => {
    const m = state.marks;
    const allMarked = m.every(Boolean);
    if (allMarked) return 'Cartela cheia';
    for (let r = 0; r < 5; r++) {
      const row = [0,1,2,3,4].map(c => r*5 + c);
      if (row.every(i => m[i])) return 'Linha completa';
    }
    for (let c = 0; c < 5; c++) {
      const col = [0,1,2,3,4].map(r => r*5 + c);
      if (col.every(i => m[i])) return 'Coluna completa';
    }
    return null;
  };

  const checkBingo = () => {
    const result = detectBingo();
    if (result) {
      showFeedback(`BINGO! ${result}.`, true);
      launchConfetti();
    } else {
      showFeedback('Ainda não rolou bingo.');
    }
  };

  const rebuildBoard = () => {
    state.board = generateBoard(activeEvent + state.playerId + (state.freeEnabled ? 'free' : 'nofree'), state.freeEnabled);
    state.marks = initMarks(state.freeEnabled);
    saveState();
    persistAndPaint();
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showFeedback('Copiado.'));
    } else {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      showFeedback('Copiado.');
    }
  };

  const bindParticipantEvents = () => {
    boardEl.addEventListener('click', (e) => {
      const target = e.target.closest('.cell');
      if (!target) return;
      const idx = Number(target.dataset.index);
      toggleMark(idx);
    });

    checkBingoBtn.addEventListener('click', checkBingo);
    copyIdBtn.addEventListener('click', () => copyToClipboard(cardIdEl.textContent));
    applyEventBtn.addEventListener('click', () => {
      const value = manualEventInput.value.trim();
      if (!value) return;
      const url = new URL(window.location.href);
      url.searchParams.set('event', value);
      window.location.href = url.toString();
    });

  };

  const initParticipant = () => {
    hostView.hidden = true;
    participantView.hidden = false;
    bindParticipantEvents();

    if (urlEvent) {
      activeEvent = urlEvent;
    } else {
      const store = loadStore();
      activeEvent = store.lastEvent || '';
    }

    if (!activeEvent) {
      missingEventNotice.hidden = false;
      showFeedback('Informe o seed do evento.');
      setControlsEnabled(false);
      return;
    }

    setControlsEnabled(true);
    missingEventNotice.hidden = true;
    setEvent(activeEvent);
  };

  const buildBaseUrl = () => {
    const path = window.location.pathname.replace(/index\\.html$/, '');
    return `${window.location.origin}${path}`;
  };

  // Confete leve para celebrar bingo sem bloquear a tela
  const confettiColors = ['#ffda67', '#18d8a2', '#8b5cf6', '#38bdf8', '#f472b6'];
  const launchConfetti = () => {
    if (prefersReducedMotion || !confettiEl) return;
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetto';
      const startX = Math.random() * 100;
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 80;
      piece.style.left = `${startX}%`;
      piece.style.top = `${Math.random() * 20 + 10}%`;
      piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--dy', `${Math.sin(angle) * distance + 120}px`);
      piece.addEventListener('animationend', () => piece.remove());
      confettiEl.appendChild(piece);
    }
  };

  const initHost = () => {
    participantView.hidden = true;
    hostView.hidden = false;
    if (urlEvent) hostEventSeed.value = urlEvent;

    hostGenerate.addEventListener('click', () => {
      const seed = hostEventSeed.value.trim();
      if (!seed) {
        hostResult.hidden = true;
        return;
      }
      const params = new URLSearchParams({ event: seed, free: '1' });
      const link = `${buildBaseUrl()}?${params.toString()}`;
      hostLink.value = link;
      hostResult.hidden = false;
      if (qrArea) {
        qrArea.innerHTML = '';
        const img = new Image();
        img.width = 180;
        img.height = 180;
        img.alt = 'QR do evento';
        img.src = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=180&light=%230b1221&dark=%2318d8a2&margin=2`;
        img.addEventListener('error', () => {
          qrArea.textContent = 'QR indisponível. Copie o link acima.';
          qrArea.style.color = '#ff8b8b';
        });
        qrArea.appendChild(img);
      }
    });

    copyLinkBtn.addEventListener('click', () => copyToClipboard(hostLink.value));
  };

  if (isHost) {
    initHost();
  } else {
    initParticipant();
  }
})();
