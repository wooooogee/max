// ============================================================================
// 1. Video Modal Global Functions
// ============================================================================
function openVideoModal(videoSrc, title) {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalVideoPlayer');
  const source = document.getElementById('modalVideoSource');
  const titleEl = document.getElementById('modalVideoTitle');
  const btnIcon = document.getElementById('btnPlayIcon');
  const btnText = document.getElementById('btnPlayText');
  const speedSelect = document.getElementById('videoSpeedSelect');

  if (!modal || !player || !source) return;

  if (titleEl && title) {
    titleEl.textContent = title;
  }

  // URL 인코딩 처리 (한글 파일명 호환)
  source.src = encodeURI(videoSrc);
  player.load();
  if (speedSelect) {
    speedSelect.value = '1.0';
    player.playbackRate = 1.0;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // 자동 재생 시도
  player.play().then(() => {
    if (btnIcon) btnIcon.className = 'fa-solid fa-pause';
    if (btnText) btnText.textContent = '일시정지';
  }).catch(() => {
    if (btnIcon) btnIcon.className = 'fa-solid fa-play';
    if (btnText) btnText.textContent = '재생';
  });
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalVideoPlayer');

  if (!modal || !player) return;

  player.pause();
  player.currentTime = 0;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// 10초 건너뛰기 탐색 함수
function seekVideo(seconds) {
  const player = document.getElementById('modalVideoPlayer');
  if (!player) return;
  
  const targetTime = player.currentTime + seconds;
  player.currentTime = Math.max(0, Math.min(player.duration || 99999, targetTime));

  // 시각적 리플 애니메이션
  const indicator = document.getElementById(seconds < 0 ? 'seekBackIndicator' : 'seekFwdIndicator');
  if (indicator) {
    indicator.classList.remove('show');
    void indicator.offsetWidth; // reflow 트리거
    indicator.classList.add('show');
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 600);
  }
}

// 재생/일시정지 토글 함수
function toggleVideoPlay() {
  const player = document.getElementById('modalVideoPlayer');
  if (!player) return;

  if (player.paused) {
    player.play();
  } else {
    player.pause();
  }
}

// ============================================================================
// 2. Lucky Draw (럭키 드로우 인터랙티브 게임 & 구슬 레이스)
// ============================================================================
let currentDrawType = 'advanced'; // 'basic' | 'advanced'
let luckyDrawMode = 'number';     // 'number' | 'names'
let isDrawing = false;
let drawnWinners = [];            // [{ rank, target, prize }]
let marbleWinners = [];           // [{ rank, target, prize }]

// 효과음 사운드 (Web Audio API)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep(freq = 600, duration = 0.08, type = 'triangle') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

let lastBounceTime = 0;
function playBounceSound(pitch = 500) {
  const now = Date.now();
  if (now - lastBounceTime < 40) return;
  lastBounceTime = now;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch (e) {}
}

// 💥 슈퍼 바운스 범퍼 사운드 (강력한 핀볼 팡!)
function playBumperSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

// 🌀 워프 블랙홀 사운드 (처음으로 리셋 순간이동!)
function playWarpSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

// ⚡ 스피드 부스터 사운드 (급가속 슈우욱!)
function playBoosterSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {}
}

function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    setTimeout(() => playBeep(freq, 0.25, 'triangle'), idx * 120);
  });
}

function playGoalSound() {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((freq, idx) => {
    setTimeout(() => playBeep(freq, 0.15, 'sine'), idx * 90);
  });
}

// ----------------------------------------------------------------------------
// 모드 전환 함수들
// ----------------------------------------------------------------------------
function switchDrawType(type) {
  if (isDrawing || isMarbleRacing) {
    alert('현재 추첨 또는 레이스가 진행 중입니다.');
    return;
  }
  currentDrawType = type;
  const btnBasic = document.getElementById('btnTypeBasic');
  const btnAdv = document.getElementById('btnTypeAdvanced');
  const stageBasic = document.getElementById('luckyStageBasic');
  const stageAdv = document.getElementById('luckyStageAdvanced');

  if (type === 'basic') {
    btnBasic.classList.add('active');
    btnAdv.classList.remove('active');
    stageBasic.style.display = 'block';
    stageAdv.style.display = 'none';
  } else {
    btnAdv.classList.add('active');
    btnBasic.classList.remove('active');
    stageAdv.style.display = 'block';
    stageBasic.style.display = 'none';
    initMarbleCanvas();
  }
}

function setDrawMode(mode) {
  if (isDrawing || isMarbleRacing) return;
  luckyDrawMode = mode;
  const tabNum = document.getElementById('tabModeNumber');
  const tabNames = document.getElementById('tabModeNames');
  const panelNum = document.getElementById('panelModeNumber');
  const panelNames = document.getElementById('panelModeNames');

  if (mode === 'number') {
    tabNum.classList.add('active');
    tabNames.classList.remove('active');
    panelNum.style.display = 'block';
    panelNames.style.display = 'none';
  } else {
    tabNames.classList.add('active');
    tabNum.classList.remove('active');
    panelNames.style.display = 'block';
    panelNum.style.display = 'none';
  }

  if (currentDrawType === 'advanced') {
    setupMarbles();
  }
}

function getParticipantsPool() {
  let pool = [];
  if (luckyDrawMode === 'number') {
    const total = parseInt(document.getElementById('inputTotalParticipants').value) || 0;
    if (total < 1) {
      alert('참가자 수를 1명 이상 입력해 주세요.');
      return null;
    }
    for (let i = 1; i <= total; i++) {
      pool.push(`No.${i}`);
    }
  } else {
    const text = document.getElementById('inputParticipantsList').value;
    pool = text.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
    if (pool.length === 0) {
      alert('참가자 명단을 1명 이상 입력해 주세요.');
      return null;
    }
  }
  return pool;
}

function getPrizeList() {
  const prizeInput = document.getElementById('inputPrizes').value;
  return prizeInput.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
}

// ----------------------------------------------------------------------------
// 추첨 전체화면 제어 함수들 (현장 발표용 Fullscreen)
// ----------------------------------------------------------------------------
function enterLuckyFullscreen() {
  const target = document.getElementById('luckyFullscreenTarget');
  if (!target) return;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(err => console.warn(err));
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    }
  }
}

function exitLuckyFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn(err));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function toggleLuckyFullscreen() {
  const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  if (isFs) {
    exitLuckyFullscreen();
  } else {
    enterLuckyFullscreen();
  }
}

function updateLuckyFullscreenState() {
  const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const btnEl = document.getElementById('btnLuckyFullscreenToggle');
  if (btnEl) {
    if (isFs) {
      btnEl.innerHTML = '<i class="fa-solid fa-compress"></i> <span id="textLuckyFs">화면 축소</span>';
    } else {
      btnEl.innerHTML = '<i class="fa-solid fa-expand"></i> <span id="textLuckyFs">전체화면 발표 모드</span>';
    }
  }
  // 전체화면 진입/해제 시 캔버스 다시 그리기
  if (currentDrawType === 'advanced') {
    setTimeout(() => {
      drawMarbleCourse();
    }, 150);
  }
}
document.addEventListener('fullscreenchange', updateLuckyFullscreenState);
document.addEventListener('webkitfullscreenchange', updateLuckyFullscreenState);

// ----------------------------------------------------------------------------
// [기본 모드] 슬롯머신 전광판 추첨 (언제든 버튼 클릭 시 즉시 재시작 가능)
// ----------------------------------------------------------------------------
let currentBasicDrawSession = 0;

async function startLuckyDraw() {
  const pool = getParticipantsPool();
  if (!pool) return;

  const winnerCount = parseInt(document.getElementById('inputWinnerCount').value) || 1;
  if (winnerCount > pool.length) {
    alert(`당첨자 수(${winnerCount}명)가 총 참가자 수(${pool.length}명)보다 많을 수 없습니다.`);
    return;
  }

  // 전체화면 시작 옵션 체크 시 전체화면 진입
  const autoFs = document.getElementById('checkAutoFullscreen');
  if (autoFs && autoFs.checked) {
    enterLuckyFullscreen();
  }

  const prizeList = getPrizeList();

  // 기존 세션 무효화하고 새 세션 시작 (언제든 재시작 지원)
  currentBasicDrawSession++;
  const thisSession = currentBasicDrawSession;

  isDrawing = true;
  drawnWinners = [];
  const startBtn = document.getElementById('btnStartDraw');
  const slotText = document.getElementById('luckySlotText');
  const statusBadge = document.getElementById('luckyStatusBadge');
  const currentPrizeEl = document.getElementById('luckyCurrentPrize');
  const resultsWrap = document.getElementById('luckyResultsWrap');
  const winnersListEl = document.getElementById('luckyWinnersList');

  startBtn.disabled = false; // 상시 클릭 가능하여 언제든 즉시 재시작 가능
  startBtn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin mr2"></i> 추첨 진행 중 (누르면 처음부터 다시 시작)';
  resultsWrap.style.display = 'none';
  winnersListEl.innerHTML = '';

  const availablePool = [...pool];

  for (let rank = 1; rank <= winnerCount; rank++) {
    if (thisSession !== currentBasicDrawSession) return; // 세션 변경 시 즉시 종료

    const prizeName = prizeList[rank - 1] || `${rank}등 당첨 상품`;
    statusBadge.textContent = `${rank}번째 행운의 주인공 추첨 중...`;
    currentPrizeEl.innerHTML = `<span class="fc_gold font_bold">[${rank}등]</span> ${prizeName}`;
    slotText.classList.add('rolling');

    // 1단계: 초고속 질주 페이즈 (약 2.4초)
    const fastEndTime = Date.now() + 2400;
    while (Date.now() < fastEndTime) {
      if (thisSession !== currentBasicDrawSession) return;
      const randIdx = Math.floor(Math.random() * availablePool.length);
      slotText.textContent = availablePool[randIdx];
      playBeep(450 + Math.random() * 250, 0.035, 'triangle');
      await new Promise(r => setTimeout(r, 45));
    }

    // 2단계: 긴장감 최고조 점진 감속 페이즈 (약 1.8초)
    const decelDelays = [65, 90, 120, 160, 220, 300, 420];
    for (const delay of decelDelays) {
      if (thisSession !== currentBasicDrawSession) return;
      const randIdx = Math.floor(Math.random() * availablePool.length);
      slotText.textContent = availablePool[randIdx];
      playBeep(520, 0.05, 'triangle');
      await new Promise(r => setTimeout(r, delay));
    }

    // 3단계: 당첨자 확정 착지!
    if (thisSession !== currentBasicDrawSession) return;
    await new Promise(r => setTimeout(r, 350));
    if (thisSession !== currentBasicDrawSession) return;

    const chosenIdx = Math.floor(Math.random() * availablePool.length);
    const chosenWinner = availablePool.splice(chosenIdx, 1)[0];

    slotText.classList.remove('rolling');
    slotText.textContent = chosenWinner;
    playFanfare();

    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    }

    drawnWinners.push({ rank, target: chosenWinner, prize: prizeName });

    // 다음 등수 추첨 전 대기
    if (rank < winnerCount) {
      await new Promise(r => setTimeout(r, 1600));
      if (thisSession !== currentBasicDrawSession) return;
    }
  }

  if (thisSession !== currentBasicDrawSession) return;

  isDrawing = false;
  startBtn.innerHTML = '<i class="fa-solid fa-trophy mr2"></i> 다시 추첨하기';
  statusBadge.textContent = '🎉 모든 당첨자 추첨 완료!';
  currentPrizeEl.innerHTML = '<span class="fc_gold font_bold">모든 당첨자분들 축하드립니다! 🎉</span>';

  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
  }

  resultsWrap.style.display = 'block';
  winnersListEl.innerHTML = drawnWinners.map(w => `
    <div class="winner_item_card">
      <div class="winner_rank_badge">${w.rank}</div>
      <div class="winner_info_text">
        <p class="winner_target">${w.target}</p>
        <p class="winner_prize">${w.prize}</p>
      </div>
    </div>
  `).join('');

  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ----------------------------------------------------------------------------
// [고급 모드] 스펙터클 마블 구슬 굴리기 레이스 (2000px 대형 코스 & 카메라 추적)
// ----------------------------------------------------------------------------
let marbleCanvas = null;
let marbleCtx = null;
let isMarbleRacing = false;
let marbleAnimFrameId = null;

// 코스 물리 제원 (단조롭고 시원한 1350px 밀폐 런웨이 트랙)
const COURSE_WIDTH = 800;
const COURSE_HEIGHT = 1350;
const VIEW_HEIGHT = 600;

// 양옆이 막힌 트랙 외벽 기준 좌표
const trackLeft = 80;
const trackRight = 720;

let cameraY = 0;
let targetCameraY = 0;

let marbles = [];
let pegs = [];
let spinners = [];
let ramps = [];
let bumpers = [];       // 💥 슈퍼 바운스 범퍼
let movingBars = [];    // ◄═► 좌우 왕복 슬라이더 바
let pendulums = [];     // ⏱️ 좌우 스윙 시계추 진자 해머
let boosters = [];      // ⚡ 스피드 부스터 패드
let warpHoles = [];     // 무한 루프 원인이던 워프홀 완전 제거
let floatingTexts = []; // 이벤트 플로팅 텍스트

let gateClosed = true;
let gateY = 85;

// 결승선: 아래 범프(y: 1165) 바로 밑 결승선 체크무늬 바 (y: 1220)
const finishLineY = 1220;
const finishGateLeft = 320;
const finishGateRight = 480;

let targetWinnersCount = 3;
let marbleRacePrizeList = [];
let countdownText = '';

const MARBLE_COLORS = [
  { main: '#ef4444', light: '#fca5a5', text: '#ffffff' }, // 레드
  { main: '#f97316', light: '#fed7aa', text: '#ffffff' }, // 오렌지
  { main: '#eab308', light: '#fef08a', text: '#0f172a' }, // 골드
  { main: '#22c55e', light: '#bbf7d0', text: '#ffffff' }, // 에메랄드
  { main: '#06b6d4', light: '#a5f3fc', text: '#0f172a' }, // 시안
  { main: '#3b82f6', light: '#bfdbfe', text: '#ffffff' }, // 로열블루
  { main: '#6366f1', light: '#c7d2fe', text: '#ffffff' }, // 인디고
  { main: '#a855f7', light: '#e9d5ff', text: '#ffffff' }, // 퍼플
  { main: '#ec4899', light: '#fbcfe8', text: '#ffffff' }, // 핑크
  { main: '#14b8a6', light: '#99f6e4', text: '#0f172a' }, // 틸
];

function initMarbleCanvas() {
  marbleCanvas = document.getElementById('marbleCanvas');
  if (!marbleCanvas) return;
  marbleCtx = marbleCanvas.getContext('2d');

  cameraY = 0;
  targetCameraY = 0;
  buildCourseObstacles();
  setupMarbles();
  drawMarbleCourse();
}

function buildCourseObstacles() {
  pegs = [];
  spinners = [];
  ramps = [];
  bumpers = [];
  movingBars = [];
  pendulums = [];
  boosters = [];
  warpHoles = [];
  floatingTexts = [];

  // ==========================================================================
  // [관문 1] 상단 출발 & 1단 유도 활주로 & 십자 풍차 (y: 85 ~ 420)
  // ==========================================================================
  // 상단 좌우에서 중앙으로 모아주는 1단 완만한 활주로 (길)
  ramps.push({ x1: trackLeft, y1: 170, x2: 290, y2: 240 });
  ramps.push({ x1: trackRight, y1: 170, x2: 510, y2: 240 });

  // 중앙 십자 회전 풍차
  spinners.push({
    x: 400, y: 315, length: 145, angle: 0, speed: 0.04, width: 10,
    color: '#06b6d4', blades: 4
  });

  // 풍차 좌우 반발 범퍼 2개
  bumpers.push({ x: 230, y: 345, radius: 24, color: '#f59e0b', lastHitTime: 0 });
  bumpers.push({ x: 570, y: 345, radius: 24, color: '#f59e0b', lastHitTime: 0 });

  // ==========================================================================
  // [관문 2] 지그재그 슬라이드 활주로 & 좌우 왕복 무빙 바 (y: 410 ~ 750)
  // ==========================================================================
  // ★ [길 1] 좌측에서 우측으로 시원하게 굴러가는 2단 슬로프 활주로!
  ramps.push({ x1: trackLeft, y1: 420, x2: 480, y2: 485 });

  // 1단 무빙 슬라이더 바 (y: 510)
  movingBars.push({
    currentX: 240,
    y: 510,
    w: 190,
    h: 22,
    minX: trackLeft + 15,
    maxX: trackRight - 205,
    speed: 160,
    dir: 1,
    color: '#38bdf8'
  });

  // 슬라이더 사이 보조 부스터 & 튕김 범퍼
  boosters.push({ x: 580, y: 530, w: 80, h: 32, boostY: 300, color: '#38bdf8' });

  // ★ [길 2] 우측에서 좌측으로 꺾여 내려오는 3단 슬로프 활주로!
  ramps.push({ x1: trackRight, y1: 585, x2: 320, y2: 650 });

  // 2단 무빙 슬라이더 바 (y: 670, 반대 방향)
  movingBars.push({
    currentX: 450,
    y: 670,
    w: 200,
    h: 22,
    minX: trackLeft + 15,
    maxX: trackRight - 215,
    speed: -170,
    dir: -1,
    color: '#ec4899'
  });

  // ==========================================================================
  // [관문 3] ⏱️ 시계추 진자 해머 분기 활주로 (y: 750 ~ 1070)
  // ==========================================================================
  // ★ [길 3] 진자 해머로 진입하는 좌우 분기 활주로
  ramps.push({ x1: trackLeft, y1: 755, x2: 240, y2: 805 });
  ramps.push({ x1: trackRight, y1: 755, x2: 560, y2: 805 });

  // 좌측 시계추 진자 (피벗축: 280, 780)
  pendulums.push({
    pivotX: 280,
    pivotY: 780,
    length: 190,
    radius: 28,
    angle: -0.7,
    amplitude: 0.75,
    omega: 3.0,
    timeOffset: 0,
    color: '#eab308',
    lastHitTime: 0
  });

  // 우측 시계추 진자 (피벗축: 520, 780)
  pendulums.push({
    pivotX: 520,
    pivotY: 780,
    length: 190,
    radius: 28,
    angle: 0.7,
    amplitude: 0.75,
    omega: 3.0,
    timeOffset: Math.PI,
    color: '#a855f7',
    lastHitTime: 0
  });

  // ★ [길 4] 진자 해머 통과 후 중앙으로 유도하는 받침 레일
  ramps.push({ x1: 180, y1: 940, x2: 360, y2: 990 });
  ramps.push({ x1: 620, y1: 940, x2: 440, y2: 990 });

  // 진자 통과 지점 중앙 범퍼 (y: 1020)
  bumpers.push({ x: 400, y: 1020, radius: 25, color: '#ef4444', lastHitTime: 0 });

  // ==========================================================================
  // [관문 4] 슈퍼 반발 존 & 결승선 중앙 반발 바 (y: 1050 ~ 1350)
  // ==========================================================================
  // 1. 슈퍼 바운스 핀볼 범퍼 2개 (y: 1060 - 핀볼 트라이앵글 형성)
  bumpers.push({ x: 260, y: 1060, radius: 24, color: '#ec4899', lastHitTime: 0 });
  bumpers.push({ x: 540, y: 1060, radius: 24, color: '#ec4899', lastHitTime: 0 });

  // 2. ★ 결승선 피니시라인에 맞춘 수문장 반발 바 (피니시라인 바로 위에 칼같이 정렬!)
  movingBars.push({
    currentX: 365,
    y: 1202,
    w: 75,
    h: 16,
    minX: 325,
    maxX: 400,
    speed: 150,
    dir: 1,
    color: '#f43f5e',
    isBouncer: true
  });

  // 3. 결승선 유도 깔때기 레일 (트랙 외벽에서 체크무늬 게이트로 시원하고 넓게 연결)
  ramps.push({ x1: trackLeft, y1: 1110, x2: finishGateLeft, y2: 1210 });
  ramps.push({ x1: trackRight, y1: 1110, x2: finishGateRight, y2: 1210 });

  // 4. 피니시 통로 수직 가이드 벽 (골인 영역 고정: y 1210 ~ 1320)
  ramps.push({ x1: finishGateLeft, y1: 1210, x2: finishGateLeft, y2: 1320 });
  ramps.push({ x1: finishGateRight, y1: 1210, x2: finishGateRight, y2: 1320 });

  // 5. 골인 통로 바닥 (구슬 안착대: y 1320)
  ramps.push({ x1: finishGateLeft, y1: 1320, x2: finishGateRight, y2: 1320 });
}

function setupMarbles() {
  const pool = getParticipantsPool();
  if (!pool || pool.length === 0) return;

  marbles = [];
  marbleWinners = [];
  floatingTexts = [];
  gateClosed = true;
  cameraY = 0;
  targetCameraY = 0;

  const count = pool.length;
  const radius = count > 50 ? 11 : count > 25 ? 13 : 15;

  const startAreaWidth = 720;
  const cols = Math.min(count, Math.floor(startAreaWidth / (radius * 2 + 4)));

  pool.forEach((name, idx) => {
    const colorTheme = MARBLE_COLORS[idx % MARBLE_COLORS.length];
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const xSpacing = startAreaWidth / cols;
    const x = 40 + xSpacing * (col + 0.5) + (Math.random() - 0.5) * 4;
    const y = 25 + row * (radius * 2 + 5);

    marbles.push({
      id: idx + 1,
      name: name,
      displayName: name.length > 5 ? name.slice(0, 4) + '..' : name,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0,
      radius: radius,
      color: colorTheme.main,
      lightColor: colorTheme.light,
      textColor: colorTheme.text,
      finished: false,
      finishRank: 0,
      finishTime: 0,
      warpCooldown: 0 // 연속 워프 방지 쿨타임
    });
  });

  updateLiveLeaderboard();
}

function updateLiveLeaderboard() {
  const liveListEl = document.getElementById('marbleLiveList');
  if (!liveListEl) return;

  if (marbleWinners.length === 0) {
    const sorted = [...marbles].sort((a, b) => b.y - a.y).slice(0, 3);
    if (sorted.length === 0 || !isMarbleRacing) {
      liveListEl.innerHTML = '<div class="marble_live_item"><span class="marble_live_rank">대기</span><span class="marble_live_name">출발 준비</span></div>';
    } else {
      liveListEl.innerHTML = sorted.map((m, idx) => `
        <div class="marble_live_item">
          <span class="marble_live_rank" style="color:#f59e0b;">선두 ${idx + 1}위</span>
          <span class="marble_live_name">${m.displayName}</span>
        </div>
      `).join('');
    }
  } else {
    liveListEl.innerHTML = marbleWinners.slice(0, 4).map(w => `
      <div class="marble_live_item">
        <span class="marble_live_rank" style="color:#fce085;">★ ${w.rank}등 골인</span>
        <span class="marble_live_name">${w.target}</span>
      </div>
    `).join('');
  }
}

// ----------------------------------------------------------------------------
// 레이스 시작 (언제든 클릭 시 즉시 리셋 & 처음부터 다시 시작 지원)
// ----------------------------------------------------------------------------
let currentMarbleRaceSession = 0;

async function startMarbleRace() {
  const pool = getParticipantsPool();
  if (!pool) return;

  targetWinnersCount = parseInt(document.getElementById('inputWinnerCount').value) || 1;
  if (targetWinnersCount > pool.length) {
    alert(`당첨자 수(${targetWinnersCount}명)가 참가자 수(${pool.length}명)보다 많을 수 없습니다.`);
    return;
  }

  // 전체화면 시작 옵션 체크 시 전체화면 진입
  const autoFs = document.getElementById('checkAutoFullscreen');
  if (autoFs && autoFs.checked) {
    enterLuckyFullscreen();
  }

  // 기존 실행 중인 애니메이션 및 세션 즉시 취소
  if (marbleAnimFrameId) {
    cancelAnimationFrame(marbleAnimFrameId);
    marbleAnimFrameId = null;
  }
  currentMarbleRaceSession++;
  const thisRaceSession = currentMarbleRaceSession;

  marbleRacePrizeList = getPrizeList();
  setupMarbles();

  isMarbleRacing = true;
  gateClosed = true;
  marbleWinners = [];
  floatingTexts = [];
  cameraY = 0;
  targetCameraY = 0;

  const startBtn = document.getElementById('btnStartMarbleRace');
  const resultsWrap = document.getElementById('marbleResultsWrap');
  const winnersListEl = document.getElementById('marbleWinnersList');

  startBtn.disabled = false; // 상시 클릭 가능하여 무한 대기 없이 언제든 즉시 재시작!
  startBtn.innerHTML = '<i class="fa-solid fa-rotate-right fa-spin mr2"></i> 레이스 진행 중 (누르면 처음부터 다시 시작)';
  resultsWrap.style.display = 'none';
  winnersListEl.innerHTML = '';

  // 1. 카운트다운 (세션 변경 시 즉시 중단)
  const countdowns = ['3', '2', '1', 'GO!'];
  for (let c of countdowns) {
    if (thisRaceSession !== currentMarbleRaceSession) return;
    countdownText = c;
    playBeep(c === 'GO!' ? 880 : 520, 0.15, 'square');
    drawMarbleCourse();
    await new Promise(r => setTimeout(r, 600));
  }
  if (thisRaceSession !== currentMarbleRaceSession) return;
  countdownText = '';

  // 게이트 오픈!
  gateClosed = false;
  playBeep(700, 0.25, 'sawtooth');

  let raceStartTime = performance.now();
  let lastTime = performance.now();

  function loop(currentTime) {
    if (thisRaceSession !== currentMarbleRaceSession) return; // 이전 세션 파기

    const dt = Math.min((currentTime - lastTime) / 1000, 0.035);
    lastTime = currentTime;

    // 만약 25초 이상 경과했는데도 당첨자가 다 안 나오는 극단적 상황 대비 안전 밸브
    const elapsedSec = (currentTime - raceStartTime) / 1000;
    if (elapsedSec > 25 && marbleWinners.length < targetWinnersCount) {
      const remainingNeed = targetWinnersCount - marbleWinners.length;
      const sortedActive = marbles.filter(m => !m.finished).sort((a, b) => b.y - a.y);
      for (let i = 0; i < Math.min(remainingNeed, sortedActive.length); i++) {
        const m = sortedActive[i];
        m.finished = true;
        const rank = marbleWinners.length + 1;
        m.finishRank = rank;
        const prize = marbleRacePrizeList[rank - 1] || `${rank}등 당첨 상품`;
        marbleWinners.push({ rank: rank, target: m.name, prize: prize });
      }
    }

    updateMarblePhysics(dt);
    drawMarbleCourse();

    if (marbleWinners.length >= targetWinnersCount) {
      endMarbleRace();
      return;
    }

    marbleAnimFrameId = requestAnimationFrame(loop);
  }

  marbleAnimFrameId = requestAnimationFrame(loop);
}

// ----------------------------------------------------------------------------
// 물리 시뮬레이션 및 이벤트 판정
// ----------------------------------------------------------------------------
function updateMarblePhysics(dt) {
  const gravity = 250; // 사용자의 요청에 따라 아주 조금만 차분하고 흥미진진하게 속도 감속!
  const restitution = 0.62;
  const friction = 0.990;
  const curTime = performance.now() / 1000;

  // 1. 스피너 회전
  spinners.forEach(sp => {
    sp.angle += sp.speed;
  });

  // 2. ◄═► 좌우 왕복 슬라이더 바 이동
  movingBars.forEach(b => {
    b.currentX += b.speed * dt;
    if (b.speed > 0 && b.currentX >= b.maxX) {
      b.currentX = b.maxX;
      b.speed = -Math.abs(b.speed);
      b.dir = -1;
    } else if (b.speed < 0 && b.currentX <= b.minX) {
      b.currentX = b.minX;
      b.speed = Math.abs(b.speed);
      b.dir = 1;
    }
  });

  // 3. ⏱️ 시계추 진자 스윙 각도 갱신
  pendulums.forEach(p => {
    p.angle = Math.sin(curTime * p.omega + p.timeOffset) * p.amplitude;
  });

  // 플로팅 텍스트 수명 감소
  floatingTexts.forEach(ft => {
    ft.y -= 25 * dt;
    ft.life -= 1;
  });
  floatingTexts = floatingTexts.filter(ft => ft.life > 0);

  // 구슬들 물리 연산
  marbles.forEach(m => {
    m.vy += gravity * dt;
    // 과속 방지 (차분하고 긴장감 넘치는 관람 속도 유지)
    m.vy = Math.min(m.vy, 310);

    m.vx *= friction;
    m.vy *= friction;

    // 미세한 랜덤 지터
    m.vx += (Math.random() - 0.5) * 2.0;

    m.x += m.vx * dt;
    m.y += m.vy * dt;

    // 출발 게이트 차단
    if (gateClosed) {
      if (m.y + m.radius > gateY) {
        m.y = gateY - m.radius;
        m.vy = -Math.abs(m.vy) * 0.2;
      }
    }

    // ★ 양옆이 막힌 트랙 외벽 충돌 (trackLeft ~ trackRight)
    if (m.x - m.radius < trackLeft) {
      m.x = trackLeft + m.radius;
      m.vx = Math.abs(m.vx) * restitution + 15;
      playBounceSound(400);
    } else if (m.x + m.radius > trackRight) {
      m.x = trackRight - m.radius;
      m.vx = -Math.abs(m.vx) * restitution - 15;
      playBounceSound(400);
    }

    // 1. ◄═► 좌우 왕복 슬라이더 바 충돌 판정
    movingBars.forEach(b => {
      const closestX = Math.max(b.currentX, Math.min(m.x, b.currentX + b.w));
      const closestY = Math.max(b.y, Math.min(m.y, b.y + b.h));
      const dx = m.x - closestX;
      const dy = m.y - closestY;
      const dist = Math.hypot(dx, dy);

      if (dist < m.radius && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        m.x = closestX + nx * m.radius;
        m.y = closestY + ny * m.radius;

        // 슬라이더 바 운동량 전달
        if (b.isBouncer) {
          // 결승선 앞 강력 반발 바: 닿는 순간 즉시 사방으로 시원하게 튕겨냄!
          m.vx = nx * 240 + b.dir * 180 + (Math.random() - 0.5) * 80;
          m.vy = -Math.abs(ny) * 160 + 40;
          playBumperSound();
          floatingTexts.push({
            text: '💥 BOING!',
            x: m.x,
            y: m.y - 18,
            color: '#f43f5e',
            life: 25,
            maxLife: 25
          });
        } else {
          // 일반 슬라이더 바
          m.vx = nx * 140 + b.dir * 120;
          m.vy = ny * 120 + 50;
          playBounceSound(520);
          if (Math.random() < 0.2) {
            floatingTexts.push({
              text: '◄═► BLOCK!',
              x: m.x,
              y: m.y - 12,
              color: '#38bdf8',
              life: 25,
              maxLife: 25
            });
          }
        }
      }
    });

    // 2. ⏱️ 시계추 진자 해머 충돌 판정
    pendulums.forEach(p => {
      const hx = p.pivotX + Math.sin(p.angle) * p.length;
      const hy = p.pivotY + Math.cos(p.angle) * p.length;

      // 진자 헤드의 선속도
      const dTheta = p.omega * Math.cos(curTime * p.omega + p.timeOffset) * p.amplitude;
      const pvx = dTheta * p.length * Math.cos(p.angle);

      const dx = m.x - hx;
      const dy = m.y - hy;
      const dist = Math.hypot(dx, dy);
      const minDist = m.radius + p.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        m.x = hx + nx * minDist;
        m.y = hy + ny * minDist;

        // 강력한 타격 반발 (스윙 속도 전이)
        m.vx = nx * 220 + pvx * 0.9;
        m.vy = Math.max(60, ny * 160 + 50);

        p.lastHitTime = Date.now();
        playBumperSound();

        if (Math.random() < 0.35) {
          floatingTexts.push({
            text: '⏱️ SMASH!',
            x: hx,
            y: hy - 18,
            color: '#f59e0b',
            life: 25,
            maxLife: 25
          });
        }
      }
    });

    // 3. 💥 슈퍼 바운스 범퍼 충돌 (시원하게 튕겨냄)
    bumpers.forEach(b => {
      const dx = m.x - b.x;
      const dy = m.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minDist = m.radius + b.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        m.x = b.x + nx * minDist;
        m.y = b.y + ny * minDist;

        m.vx = nx * 260 + (Math.random() - 0.5) * 80;
        m.vy = -Math.abs(ny) * 160 + 60; // 위로 무한 치솟지 않고 튕긴 후 하강

        b.lastHitTime = Date.now();
        playBumperSound();

        floatingTexts.push({
          text: '💥 BOING!',
          x: b.x,
          y: b.y - 18,
          color: '#f43f5e',
          life: 25,
          maxLife: 25
        });
      }
    });

    // 4. ⚡ 스피드 부스터 패드 (급가속)
    boosters.forEach(bst => {
      if (!m.finished) {
        if (m.x >= bst.x && m.x <= bst.x + bst.w &&
            m.y >= bst.y && m.y <= bst.y + bst.h) {
          m.vy += bst.boostY * dt * 8; // 하향 급가속!
          playBoosterSound();

          if (Math.random() < 0.2) {
            floatingTexts.push({
              text: '⚡ BOOST!',
              x: m.x,
              y: m.y - 15,
              color: '#38bdf8',
              life: 22,
              maxLife: 22
            });
          }
        }
      }
    });

    // 5. 십자 회전 풍차 충돌
    spinners.forEach(sp => {
      const bladeAngles = sp.blades === 4
        ? [sp.angle, sp.angle + Math.PI / 2]
        : [sp.angle];

      bladeAngles.forEach(ang => {
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const halfLen = sp.length / 2;

        const x1 = sp.x - cos * halfLen;
        const y1 = sp.y - sin * halfLen;
        const x2 = sp.x + cos * halfLen;
        const y2 = sp.y + sin * halfLen;

        const lineLenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        let t = ((m.x - x1) * (x2 - x1) + (m.y - y1) * (y2 - y1)) / lineLenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.hypot(m.x - projX, m.y - projY);

        if (dist < m.radius + sp.width / 2 && dist > 0) {
          const nx = (m.x - projX) / dist;
          const ny = (m.y - projY) / dist;

          m.x = projX + nx * (m.radius + sp.width / 2);
          m.y = projY + ny * (m.radius + sp.width / 2);

          const tangentVx = -sin * sp.speed * 60;
          const tangentVy = cos * sp.speed * 60;

          m.vx = -m.vx * restitution + tangentVx * 0.9;
          m.vy = -m.vy * restitution + tangentVy * 0.9;

          playBounceSound(650);
        }
      });
    });

    // 6. 경사로(Ramps) 충돌
    ramps.forEach(ramp => {
      const lineLenSq = (ramp.x2 - ramp.x1) ** 2 + (ramp.y2 - ramp.y1) ** 2;
      let t = ((m.x - ramp.x1) * (ramp.x2 - ramp.x1) + (m.y - ramp.y1) * (ramp.y2 - ramp.y1)) / lineLenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = ramp.x1 + t * (ramp.x2 - ramp.x1);
      const projY = ramp.y1 + t * (ramp.y2 - ramp.y1);
      const dist = Math.hypot(m.x - projX, m.y - projY);

      if (dist < m.radius + 3 && dist > 0) {
        const nx = (m.x - projX) / dist;
        const ny = (m.y - projY) / dist;

        m.x = projX + nx * (m.radius + 3);
        m.y = projY + ny * (m.radius + 3);

        const velAlongNormal = m.vx * nx + m.vy * ny;
        if (velAlongNormal < 0) {
          m.vx -= (1 + 0.3) * velAlongNormal * nx;
          m.vy -= (1 + 0.3) * velAlongNormal * ny;

          // 레일 길을 따라 아래쪽으로 매끄럽게 굴러가는 슬라이딩 유도
          const tx = (ramp.x2 - ramp.x1);
          const ty = (ramp.y2 - ramp.y1);
          const tLen = Math.hypot(tx, ty);
          if (tLen > 0) {
            m.vx += (tx / tLen) * 90 * dt;
            m.vy += (ty / tLen) * 90 * dt;
          }
          playBounceSound(420);
        }
      }
    });

    // 7. 🏁 피니시 라인 골인 판정 (게이트 중앙 320~480 통과 시 인정)
    if (!m.finished && m.y >= finishLineY && m.y <= finishLineY + 35) {
      if (m.x >= finishGateLeft && m.x <= finishGateRight) {
        m.finished = true;
        const rank = marbleWinners.length + 1;
        m.finishRank = rank;
        m.finishTime = Date.now();

        const prize = marbleRacePrizeList[rank - 1] || `${rank}등 당첨 상품`;
        marbleWinners.push({ rank: rank, target: m.name, prize: prize });

        playGoalSound();

        floatingTexts.push({
          text: `★ ${rank}등 골인: ${m.displayName}!`,
          x: m.x,
          y: m.y - 25,
          color: '#fce085',
          life: 60,
          maxLife: 60
        });

        if (typeof confetti === 'function') {
          confetti({
            particleCount: 50,
            spread: 55,
            origin: { x: (m.x / 800), y: 0.75 }
          });
        }
      }
    }

    // 최하단 바닥 안전 정지 (y: 1318, 골인 박스 바닥)
    if (m.y + m.radius > 1318) {
      m.y = 1318 - m.radius;
      m.vy = -m.vy * 0.1;
      m.vx *= 0.8;
    }
  });

  // 구슬 간 충돌
  for (let i = 0; i < marbles.length; i++) {
    for (let j = i + 1; j < marbles.length; j++) {
      const m1 = marbles[i];
      const m2 = marbles[j];
      const dx = m2.x - m1.x;
      const dy = m2.y - m1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = m1.radius + m2.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        m1.x -= nx * overlap * 0.5;
        m1.y -= ny * overlap * 0.5;
        m2.x += nx * overlap * 0.5;
        m2.y += ny * overlap * 0.5;

        const kx = m1.vx - m2.vx;
        const ky = m1.vy - m2.vy;
        const p = 2 * (nx * kx + ny * ky) / 2;

        m1.vx -= p * nx * 0.7;
        m1.vy -= p * ny * 0.7;
        m2.vx += p * nx * 0.7;
        m2.vy += p * ny * 0.7;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 카메라 부드러운 스크롤 (Camera Scrolling)
  // --------------------------------------------------------------------------
  const activeMarbles = marbles.filter(m => !m.finished);
  let leaderY = 0;
  if (activeMarbles.length > 0) {
    activeMarbles.sort((a, b) => b.y - a.y);
    leaderY = activeMarbles[0].y;
  } else if (marbles.length > 0) {
    leaderY = finishLineY;
  }

  const desiredCam = Math.max(0, Math.min(COURSE_HEIGHT - VIEW_HEIGHT, leaderY - 180));
  cameraY += (desiredCam - cameraY) * 0.06;

  updateLiveLeaderboard();
}

// ----------------------------------------------------------------------------
// 캔버스 렌더링 (코스 + 카메라 뷰 + HUD)
// ----------------------------------------------------------------------------
function drawMarbleCourse() {
  if (!marbleCtx || !marbleCanvas) return;
  const ctx = marbleCtx;
  const W = marbleCanvas.width;
  const H = marbleCanvas.height;

  // 전체 화면 클리어
  ctx.fillStyle = '#060a12';
  ctx.fillRect(0, 0, W, H);

  // ==========================================================================
  // [월드 공간 렌더링 (카메라 스크롤 적용: -cameraY)]
  // ==========================================================================
  ctx.save();
  ctx.translate(0, -Math.floor(cameraY));

  // 코스 배경 그라데이션
  const courseBg = ctx.createLinearGradient(0, 0, 0, COURSE_HEIGHT);
  courseBg.addColorStop(0, '#0a1324');
  courseBg.addColorStop(0.3, '#0c1527');
  courseBg.addColorStop(0.6, '#0f172a');
  courseBg.addColorStop(1, '#050811');
  ctx.fillStyle = courseBg;
  ctx.fillRect(0, 0, COURSE_WIDTH, COURSE_HEIGHT);

  // 배경 미세 격자 (트랙 내부만)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let x = trackLeft; x <= trackRight; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, COURSE_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < COURSE_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(trackLeft, y);
    ctx.lineTo(trackRight, y);
    ctx.stroke();
  }

  // ★ 양옆이 완전히 막힌 트랙 외벽 레일 (x=80, x=720)
  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.fillRect(0, 0, trackLeft, COURSE_HEIGHT);
  ctx.fillRect(trackRight, 0, COURSE_WIDTH - trackRight, COURSE_HEIGHT);

  // 트랙 네온 외벽 라인
  ctx.strokeStyle = '#c9a24f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(trackLeft, 0); ctx.lineTo(trackLeft, 1220);
  ctx.moveTo(trackRight, 0); ctx.lineTo(trackRight, 1220);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 232, 161, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(trackLeft, 0); ctx.lineTo(trackLeft, 1220);
  ctx.moveTo(trackRight, 0); ctx.lineTo(trackRight, 1220);
  ctx.stroke();

  // 1. 출발 게이트
  ctx.fillStyle = gateClosed ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.4)';
  ctx.fillRect(trackLeft, gateY - 5, trackRight - trackLeft, 10);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gateClosed ? '🔒 START GATE (CLOSED)' : '🏁 GATE OPENED', COURSE_WIDTH / 2, gateY);

  // 2. ⚡ 스피드 부스터 패드 렌더링
  boosters.forEach(bst => {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(bst.x, bst.y, bst.w, bst.h);
    ctx.strokeStyle = bst.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(bst.x, bst.y, bst.w, bst.h);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ BOOST ⚡', bst.x + bst.w / 2, bst.y + bst.h / 2 + 4);
  });

  // 3. ◄═► 좌우 왕복 슬라이더 바 렌더링
  movingBars.forEach(b => {
    // 슬라이더 이동 가이드 슬롯 레일
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b.minX, b.y + b.h / 2);
    ctx.lineTo(b.maxX + b.w, b.y + b.h / 2);
    ctx.stroke();

    // 슬라이더 바 몸체
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(b.currentX, b.y, b.w, b.h, 10);
    ctx.fillStyle = b.isBouncer ? '#f43f5e' : b.color;
    ctx.fill();
    ctx.strokeStyle = b.isBouncer ? '#ffe4e6' : '#ffffff';
    ctx.lineWidth = b.isBouncer ? 2.5 : 2;
    ctx.stroke();

    // 슬라이더 바 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.font = b.w < 85 ? 'bold 9px sans-serif' : 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.isBouncer ? '💥BOUNCE💥' : (b.speed > 0 ? '▶ MOVING SLIDER ▶' : '◀ MOVING SLIDER ◀'), b.currentX + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  });

  // 4. ⏱️ 시계추 진자 해머 (Pendulums) 렌더링
  pendulums.forEach(p => {
    const hx = p.pivotX + Math.sin(p.angle) * p.length;
    const hy = p.pivotY + Math.cos(p.angle) * p.length;
    const isLit = (Date.now() - p.lastHitTime) < 180;

    // 상단 피벗 힌지
    ctx.beginPath();
    ctx.arc(p.pivotX, p.pivotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 서스펜션 로드 (스틸 바)
    ctx.beginPath();
    ctx.moveTo(p.pivotX, p.pivotY);
    ctx.lineTo(hx, hy);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 헤비 메탈 원형 추 (해머 머리)
    ctx.save();
    ctx.beginPath();
    ctx.arc(hx, hy, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#ffffff' : p.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 추 내부 링 디자인
    ctx.beginPath();
    ctx.arc(hx, hy, p.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#fef08a' : '#0f172a';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HAMMER', hx, hy);
    ctx.restore();
  });

  // 5. 💥 슈퍼 바운스 범퍼 렌더링
  bumpers.forEach(b => {
    const isLit = (Date.now() - b.lastHitTime) < 180;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#ffffff' : b.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 범퍼 링
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#fda4af' : '#0f172a';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BUMP', b.x, b.y);
  });

  // 6. 회전 스피너 (십자 풍차)
  spinners.forEach(sp => {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.angle);

    const bladeCount = sp.blades || 2;
    const angles = bladeCount === 4 ? [0, Math.PI / 2] : [0];

    angles.forEach(ang => {
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.roundRect(-sp.length / 2, -sp.width / 2, sp.length, sp.width, sp.width / 2);
      ctx.fillStyle = sp.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });

  // 7. 경사로 및 유도 깔때기 레일
  ramps.forEach(ramp => {
    ctx.beginPath();
    ctx.moveTo(ramp.x1, ramp.y1);
    ctx.lineTo(ramp.x2, ramp.y2);
    ctx.strokeStyle = '#c9a24f';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 232, 161, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 8. 🏁 피니시 라인 (체커 플래그 & 게이트)
  const squareSize = 10;
  for (let fx = finishGateLeft; fx < finishGateRight; fx += squareSize) {
    for (let fy = finishLineY; fy < finishLineY + 14; fy += squareSize) {
      const isBlack = (Math.floor((fx - finishGateLeft) / squareSize) + Math.floor((fy - finishLineY) / squareSize)) % 2 === 0;
      ctx.fillStyle = isBlack ? '#000000' : '#ffffff';
      ctx.fillRect(fx, fy, squareSize, squareSize);
    }
  }

  // FINISH 라벨 (체크무늬 바 & 바운스바 상단 명확한 안내 텍스트)
  ctx.save();
  ctx.fillStyle = '#fce085';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText('★ FINISH GATE (골인 지점) ★', COURSE_WIDTH / 2, finishLineY - 24);
  ctx.restore();

  // 9. 구슬(Marbles) 렌더링
  marbles.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);

    ctx.beginPath();
    ctx.arc(1.5, 2, m.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const shine = ctx.createRadialGradient(
      -m.radius * 0.35, -m.radius * 0.35, 1,
      0, 0, m.radius
    );
    shine.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    shine.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
    shine.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = shine;
    ctx.fill();

    ctx.fillStyle = m.textColor;
    ctx.font = `bold ${Math.max(9, m.radius - 3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.displayName, 0, 0.5);

    // 골인 순위 배지
    if (m.finished && m.finishRank > 0) {
      ctx.beginPath();
      ctx.arc(m.radius * 0.7, -m.radius * 0.7, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(m.finishRank, m.radius * 0.7, -m.radius * 0.7 + 0.5);
    }

    ctx.restore();
  });

  // 10. 이벤트 플로팅 텍스트 렌더링
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  ctx.restore(); // 월드 공간 종료

  // ==========================================================================
  // 화면 고정 UI (HUD & 미니맵 트랙 바 & 카운트다운)
  // ==========================================================================
  // 우측 미니맵 진행도 바 (Track Minimap)
  const mapX = W - 22;
  const mapY = 80;
  const mapW = 10;
  const mapH = 340;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.roundRect(mapX - 4, mapY - 8, mapW + 8, mapH + 16, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(201, 162, 79, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 미니맵 코스 바
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  // 미니맵 피니시 라인 표시
  const mapFinishY = mapY + (finishLineY / COURSE_HEIGHT) * mapH;
  ctx.fillStyle = '#fce085';
  ctx.fillRect(mapX - 2, mapFinishY - 2, mapW + 4, 4);

  // 미니맵 무빙 슬라이더 바 위치 표시
  movingBars.forEach(b => {
    const bY = mapY + (b.y / COURSE_HEIGHT) * mapH;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(mapX, bY - 1, mapW, 2);
  });

  // 미니맵 진자 해머 위치 표시
  pendulums.forEach(p => {
    const pY = mapY + (p.pivotY / COURSE_HEIGHT) * mapH;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(mapX, pY - 1, mapW, 2);
  });

  // 미니맵 구슬 점들
  marbles.forEach(m => {
    const my = mapY + (m.y / COURSE_HEIGHT) * mapH;
    ctx.beginPath();
    ctx.arc(mapX + mapW / 2, my, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = m.finished ? '#fce085' : m.color;
    ctx.fill();
  });

  // 미니맵 현재 카메라 뷰 창 표시
  const camBoxY = mapY + (cameraY / COURSE_HEIGHT) * mapH;
  const camBoxH = (VIEW_HEIGHT / COURSE_HEIGHT) * mapH;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mapX - 3, camBoxY, mapW + 6, camBoxH);

  // 카운트다운 텍스트 오버레이
  if (countdownText) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 74px sans-serif';
    ctx.fillStyle = countdownText === 'GO!' ? '#22c55e' : '#fce085';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText(countdownText, W / 2, H / 2);
    ctx.shadowBlur = 0;
  }
}

// ----------------------------------------------------------------------------
// 레이스 종료 및 최종 당첨자 발표
// ----------------------------------------------------------------------------
function endMarbleRace() {
  if (marbleAnimFrameId) {
    cancelAnimationFrame(marbleAnimFrameId);
    marbleAnimFrameId = null;
  }
  isMarbleRacing = false;

  const startBtn = document.getElementById('btnStartMarbleRace');
  const resultsWrap = document.getElementById('marbleResultsWrap');
  const winnersListEl = document.getElementById('marbleWinnersList');

  startBtn.disabled = false;
  startBtn.innerHTML = '<i class="fa-solid fa-trophy mr2"></i> 레이스 다시 시작하기';

  playFanfare();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 160, spread: 110, origin: { y: 0.5 } });
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.4 } });
    }, 450);
  }

  resultsWrap.style.display = 'block';
  winnersListEl.innerHTML = marbleWinners.map(w => `
    <div class="winner_item_card">
      <div class="winner_rank_badge">${w.rank}</div>
      <div class="winner_info_text">
        <p class="winner_target">${w.target}</p>
        <p class="winner_prize">${w.prize}</p>
      </div>
    </div>
  `).join('');

  resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ----------------------------------------------------------------------------
// 초기화 및 명단 복사
// ----------------------------------------------------------------------------
function resetLuckyDraw() {
  // 실행 중인 애니메이션 및 세션 강제 종료
  if (marbleAnimFrameId) {
    cancelAnimationFrame(marbleAnimFrameId);
    marbleAnimFrameId = null;
  }
  currentMarbleRaceSession++;
  currentBasicDrawSession++;
  isDrawing = false;
  isMarbleRacing = false;

  drawnWinners = [];
  marbleWinners = [];

  const slotText = document.getElementById('luckySlotText');
  const statusBadge = document.getElementById('luckyStatusBadge');
  const currentPrize = document.getElementById('luckyCurrentPrize');
  const resultsWrap = document.getElementById('luckyResultsWrap');
  const winnersList = document.getElementById('luckyWinnersList');
  const startBtn = document.getElementById('btnStartDraw');

  if (slotText) slotText.textContent = 'READY!';
  if (statusBadge) statusBadge.textContent = '추첨 준비 완료';
  if (currentPrize) currentPrize.textContent = '버튼을 누르면 행운의 추첨이 시작됩니다!';
  if (resultsWrap) resultsWrap.style.display = 'none';
  if (winnersList) winnersList.innerHTML = '';
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.innerHTML = '<i class="fa-solid fa-bolt mr2"></i> 빠른 번호 추첨!';
  }

  const marbleResultsWrap = document.getElementById('marbleResultsWrap');
  const marbleWinnersList = document.getElementById('marbleWinnersList');
  const btnStartMarble = document.getElementById('btnStartMarbleRace');

  if (marbleResultsWrap) marbleResultsWrap.style.display = 'none';
  if (marbleWinnersList) marbleWinnersList.innerHTML = '';
  if (btnStartMarble) {
    btnStartMarble.disabled = false;
    btnStartMarble.innerHTML = '<i class="fa-solid fa-play mr2"></i> 구슬 레이스 출발! (GO)';
  }

  initMarbleCanvas();
}

function copyWinners(type = 'marble') {
  const targetList = (type === 'basic') ? drawnWinners : marbleWinners;
  if (!targetList || targetList.length === 0) {
    alert('아직 당첨자 명단이 없습니다.');
    return;
  }
  const title = (type === 'basic') ? '[기본 모드 당첨자 명단]' : '[🏁 구슬 레이스 당첨자 명단]';
  const text = title + '\n' + targetList.map(w => `[${w.rank}등] ${w.target} (${w.prize})`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    alert('당첨자 명단이 클립보드에 복사되었습니다!\n\n' + text);
  }).catch(() => {
    alert(text);
  });
}



// ============================================================================
// 3. DOMContentLoaded Listeners & Sliders
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
  
  // 1. 하단 썸네일 스와이퍼
  const presThumbsSwiper = new Swiper('.presentation-thumbs-swiper', {
    spaceBetween: 8,
    slidesPerView: 4,
    freeMode: true,
    watchSlidesProgress: true,
    breakpoints: {
      480: { slidesPerView: 5, spaceBetween: 8 },
      768: { slidesPerView: 7, spaceBetween: 10 },
      1024: { slidesPerView: 9, spaceBetween: 12 },
      1200: { slidesPerView: 11, spaceBetween: 12 }
    }
  });

  // 2. 메인 프레젠테이션 스와이퍼
  const presSwiper = new Swiper('.presentation-swiper', {
    spaceBetween: 0,
    slidesPerView: 1,
    navigation: {
      nextEl: '.pres_btn_next',
      prevEl: '.pres_btn_prev',
    },
    pagination: {
      el: '.pres_pagination',
      type: 'fraction',
      formatFractionCurrent: (number) => String(number).padStart(2, '0'),
      formatFractionTotal: (number) => String(number).padStart(2, '0'),
    },
    keyboard: {
      enabled: true,
      onlyInViewport: false,
    },
    thumbs: {
      swiper: presThumbsSwiper,
    },
  });

  // 3. 전체화면 토글 기능
  const fullscreenBtn = document.getElementById('presFullscreenBtn');
  const presWrapper = document.getElementById('presWrapper');

  if (fullscreenBtn && presWrapper) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (presWrapper.requestFullscreen) {
          presWrapper.requestFullscreen().catch(err => console.warn(err));
        } else if (presWrapper.webkitRequestFullscreen) {
          presWrapper.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    const updateFullscreenState = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (isFs) {
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> <span class="fs_14 font_medium">화면 축소</span>';
      } else {
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> <span class="fs_14 font_medium">전체화면</span>';
      }
      setTimeout(() => {
        presSwiper.update();
        presThumbsSwiper.update();
      }, 100);
    };

    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  }

  // 4. 모달 비디오 플레이어 컨트롤 이벤트 바인딩
  const player = document.getElementById('modalVideoPlayer');
  const btnSeekBack10 = document.getElementById('btnSeekBack10');
  const btnSeekFwd10 = document.getElementById('btnSeekFwd10');
  const btnTogglePlay = document.getElementById('btnTogglePlay');
  const btnPlayIcon = document.getElementById('btnPlayIcon');
  const btnPlayText = document.getElementById('btnPlayText');
  const speedSelect = document.getElementById('videoSpeedSelect');
  const modalVideoWrapper = document.getElementById('modalVideoWrapper');

  if (btnSeekBack10) {
    btnSeekBack10.addEventListener('click', () => seekVideo(-10));
  }
  if (btnSeekFwd10) {
    btnSeekFwd10.addEventListener('click', () => seekVideo(10));
  }
  if (btnTogglePlay) {
    btnTogglePlay.addEventListener('click', toggleVideoPlay);
  }

  if (speedSelect && player) {
    speedSelect.addEventListener('change', (e) => {
      player.playbackRate = parseFloat(e.target.value);
    });
  }

  if (player) {
    player.addEventListener('play', () => {
      if (btnPlayIcon) btnPlayIcon.className = 'fa-solid fa-pause';
      if (btnPlayText) btnPlayText.textContent = '일시정지';
    });
    player.addEventListener('pause', () => {
      if (btnPlayIcon) btnPlayIcon.className = 'fa-solid fa-play';
      if (btnPlayText) btnPlayText.textContent = '재생';
    });
  }

  // 화면 더블 클릭/탭으로 유튜브식 건너뛰기
  if (modalVideoWrapper) {
    let lastClickTime = 0;
    modalVideoWrapper.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.classList.contains('seek_indicator')) return;
      
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - lastClickTime;
      
      if (timeDiff < 300) {
        const rect = modalVideoWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX < rect.width / 2) {
          seekVideo(-10);
        } else {
          seekVideo(10);
        }
      }
      lastClickTime = currentTime;
    });
  }

  // 5. 키보드 단축키 및 모달 닫기
  const modal = document.getElementById('videoModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeVideoModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    const isModalOpen = modal && modal.classList.contains('active');

    if (isModalOpen) {
      if (e.key === 'Escape') {
        closeVideoModal();
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        seekVideo(-10);
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        seekVideo(10);
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        toggleVideoPlay();
      }
    }
  });

  // 6. 마블 레이스 캔버스 초기화 및 입력 변경 감지
  initMarbleCanvas();

  const inputTotal = document.getElementById('inputTotalParticipants');
  const inputList = document.getElementById('inputParticipantsList');
  if (inputTotal) {
    inputTotal.addEventListener('input', () => {
      if (!isMarbleRacing && currentDrawType === 'advanced' && luckyDrawMode === 'number') {
        setupMarbles();
        drawMarbleCourse();
      }
    });
  }
  if (inputList) {
    inputList.addEventListener('input', () => {
      if (!isMarbleRacing && currentDrawType === 'advanced' && luckyDrawMode === 'names') {
        setupMarbles();
        drawMarbleCourse();
      }
    });
  }

  // 7. QR 시스템 초기화 (참가신청 QR & 가입신청 QR)
  initQrSystem();

});

// ----------------------------------------------------------------------------
// [공식 운항 일정] 탭 전환 함수
// ----------------------------------------------------------------------------
function switchItinTab(tabId) {
  const allBtns = document.querySelectorAll('.itin_tab_btn');
  const allPanels = document.querySelectorAll('.itin_content_panel');

  allBtns.forEach(btn => btn.classList.remove('active'));
  allPanels.forEach(panel => panel.classList.remove('active'));

  const targetPanel = document.getElementById(`itin-${tabId}`);
  if (targetPanel) targetPanel.classList.add('active');

  const activeBtn = Array.from(allBtns).find(btn => btn.getAttribute('onclick')?.includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');
}

// ============================================================================
// [QR Code 시스템] 럭키드로우 참가신청 QR & 온라인 가입신청 QR
// ============================================================================
let luckyQrCodeInstance = null;
let joinQrCodeInstance = null;
let qrBroadcastChannel = null;

function initQrSystem() {
  updateQrEntryCountDisplays();

  // 1. BroadcastChannel 및 LocalStorage 변경 감지 (실시간 참가 접수)
  try {
    if ('BroadcastChannel' in window) {
      qrBroadcastChannel = new BroadcastChannel('lucky_draw_channel');
      qrBroadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_ENTRY') {
          handleIncomingQrEntry(event.data.data);
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'lucky_draw_entries') {
      updateQrEntryCountDisplays();
      renderEntryTable();
    }
  });

  // ESC 키로 QR 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLuckyQrModal();
      closeJoinQrModal();
      closeEntryListModal();
    }
  });

  // 모달 배경 클릭 시 닫기
  ['luckyQrModal', 'joinQrModal', 'entryListModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          el.classList.remove('active');
        }
      });
    }
  });
}

// 실시간 참가자 수 갱신
function getStoredQrEntries() {
  try {
    return JSON.parse(localStorage.getItem('lucky_draw_entries') || '[]');
  } catch (e) {
    return [];
  }
}

function updateQrEntryCountDisplays() {
  const entries = getStoredQrEntries();
  const count = entries.length;

  const headerCnt = document.getElementById('qrEntryCountHeader');
  const subCnt = document.getElementById('qrEntryCountSub');
  const modalCnt = document.getElementById('modalLuckyQrCount');
  const listModalCnt = document.getElementById('modalListTotalCount');

  if (headerCnt) headerCnt.textContent = count;
  if (subCnt) subCnt.textContent = count;
  if (modalCnt) modalCnt.textContent = count;
  if (listModalCnt) listModalCnt.textContent = count;
}

// 실시간 접수 메시지 처리
function handleIncomingQrEntry(entry) {
  updateQrEntryCountDisplays();
  renderEntryTable();

  showQrToast(`🎉 [${entry.name}]님이 럭키드로우에 참가 신청하셨습니다!`);

  // 자동 반영 옵션이 켜져 있는 경우
  const autoSyncCheck = document.getElementById('checkAutoSyncQr');
  if (autoSyncCheck && autoSyncCheck.checked) {
    appendEntryToDrawList(entry);
  }
}

function appendEntryToDrawList(entry) {
  const inputList = document.getElementById('inputParticipantsList');
  if (!inputList) return;

  const phoneTail = entry.phone ? entry.phone.slice(-4) : '';
  const label = phoneTail ? `${entry.name}(${phoneTail})` : entry.name;

  let current = inputList.value.trim();
  const lines = current ? current.split('\n').map(l => l.trim()).filter(Boolean) : [];

  if (!lines.includes(label)) {
    lines.push(label);
    inputList.value = lines.join('\n');

    // 고객명단 모드로 자동 전환 및 구슬 생성
    if (luckyDrawMode !== 'names') {
      setDrawMode('names');
    } else if (!isMarbleRacing && currentDrawType === 'advanced') {
      setupMarbles();
      drawMarbleCourse();
    }
  }
}

// --- 1. 럭키드로우 참가신청 QR 모달 ---
function getLuckyEntryUrl() {
  try {
    // 현재 URL 위치 기준 entry.html 절대 경로 생성
    return new URL('entry.html', window.location.href).href;
  } catch (e) {
    return window.location.origin + '/entry.html';
  }
}

function openLuckyQrModal() {
  const modal = document.getElementById('luckyQrModal');
  if (!modal) return;

  const url = getLuckyEntryUrl();
  const urlText = document.getElementById('luckyQrUrlText');
  if (urlText) urlText.textContent = url;

  updateQrEntryCountDisplays();

  const holder = document.getElementById('luckyQrCodeHolder');
  if (holder) {
    holder.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      luckyQrCodeInstance = new QRCode(holder, {
        text: url,
        width: 240,
        height: 240,
        colorDark: '#0b1120',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      // Fallback
      holder.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR Code" style="width:240px;height:240px;">`;
    }
  }

  modal.classList.add('active');
}

function closeLuckyQrModal() {
  const modal = document.getElementById('luckyQrModal');
  if (modal) modal.classList.remove('active');
}

function copyLuckyQrUrl() {
  const url = getLuckyEntryUrl();
  navigator.clipboard.writeText(url).then(() => {
    showQrToast('📋 참가신청 링크가 클립보드에 복사되었습니다!');
  }).catch(() => {
    prompt('참가신청 주소를 복사하세요:', url);
  });
}

function applyQrAndStartDraw() {
  closeLuckyQrModal();
  applyQrEntriesToDraw();

  const section = document.getElementById('lucky-draw');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// --- 2. 크루즈 멤버십 온라인 가입신청 QR 모달 ---
function openJoinQrModal() {
  const modal = document.getElementById('joinQrModal');
  if (!modal) return;

  const inputUrl = document.getElementById('inputJoinUrl');
  const url = inputUrl ? inputUrl.value.trim() : 'https://intranet.htourzone.co.kr/api/join/?s=20260090';

  updateJoinQrCode(url);
  modal.classList.add('active');
}

function closeJoinQrModal() {
  const modal = document.getElementById('joinQrModal');
  if (modal) modal.classList.remove('active');
}

function updateJoinQrCode(url) {
  if (!url) return;
  const holder = document.getElementById('joinQrCodeHolder');
  const directLink = document.getElementById('linkOpenJoinDirect');

  if (directLink) directLink.href = url;

  if (holder) {
    holder.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      joinQrCodeInstance = new QRCode(holder, {
        text: url,
        width: 240,
        height: 240,
        colorDark: '#0b1120',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      holder.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}" alt="QR Code" style="width:240px;height:240px;">`;
    }
  }
}

function copyJoinUrl() {
  const inputUrl = document.getElementById('inputJoinUrl');
  const url = inputUrl ? inputUrl.value.trim() : 'https://intranet.htourzone.co.kr/api/join/?s=20260090';
  navigator.clipboard.writeText(url).then(() => {
    showQrToast('📋 가입신청 링크가 클립보드에 복사되었습니다!');
  }).catch(() => {
    prompt('가입신청 링크를 복사하세요:', url);
  });
}

// --- 3. 현장 신청자 명단 확인 & 관리 모달 ---
function openEntryListModal() {
  const modal = document.getElementById('entryListModal');
  if (!modal) return;

  renderEntryTable();
  updateQrEntryCountDisplays();
  modal.classList.add('active');
}

function closeEntryListModal() {
  const modal = document.getElementById('entryListModal');
  if (modal) modal.classList.remove('active');
}

function renderEntryTable() {
  const tbody = document.getElementById('entryTableBody');
  if (!tbody) return;

  const entries = getStoredQrEntries();
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">아직 접수된 현장 신청자가 없습니다.<br>QR코드를 스캔하여 신청하거나, 상단 [+ 샘플 10명]으로 테스트해 보세요!</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map((item, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 9px 12px; font-weight: 700; color:#64748b;">${idx + 1}</td>
      <td style="padding: 9px 12px; font-weight: 700; color:#0f172a;">${item.name}</td>
      <td style="padding: 9px 12px; color:#334155;">${item.phoneMasked || item.phone}</td>
      <td style="padding: 9px 12px;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">${item.attend || '현장참석'}</span></td>
      <td style="padding: 9px 12px; color:#64748b; font-size:12px;">${item.time || '-'}</td>
      <td style="padding: 9px 12px; text-align: center;">
        <button type="button" onclick="deleteQrEntry('${item.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:13px;" title="삭제">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function deleteQrEntry(id) {
  let entries = getStoredQrEntries();
  entries = entries.filter(e => e.id !== id);
  localStorage.setItem('lucky_draw_entries', JSON.stringify(entries));
  renderEntryTable();
  updateQrEntryCountDisplays();
}

function clearAllQrEntries() {
  if (!confirm('등록된 현장 신청자 명단을 모두 삭제하시겠습니까?')) return;
  localStorage.removeItem('lucky_draw_entries');
  renderEntryTable();
  updateQrEntryCountDisplays();
  showQrToast('신청자 명단이 모두 삭제되었습니다.');
}

function clearAllEntriesText() {
  const inputList = document.getElementById('inputParticipantsList');
  if (inputList) {
    inputList.value = '';
    if (!isMarbleRacing && currentDrawType === 'advanced' && luckyDrawMode === 'names') {
      setupMarbles();
      drawMarbleCourse();
    }
  }
}

// 명단에 주입하기
function applyQrEntriesToDraw() {
  const entries = getStoredQrEntries();
  if (entries.length === 0) {
    alert('접수된 현장 신청자가 없습니다. QR코드를 통해 접수하거나 샘플 참가자를 생성해 보세요.');
    return;
  }

  const lines = entries.map(item => {
    const tail = item.phone ? item.phone.slice(-4) : '';
    return tail ? `${item.name}(${tail})` : item.name;
  });

  const inputList = document.getElementById('inputParticipantsList');
  if (inputList) {
    inputList.value = lines.join('\n');
    setDrawMode('names');
    showQrToast(`✅ 신청자 ${entries.length}명이 럭키드로우에 등록되었습니다!`);
  }
}

// 테스트용 샘플 10명 생성
function generateSampleEntries() {
  const sampleNames = ['김민준', '이서연', '박도윤', '최지우', '정하은', '한예준', '유시아', '강동현', '임수아', '조현우'];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const current = getStoredQrEntries();
  sampleNames.forEach((name, i) => {
    const random4 = Math.floor(1000 + Math.random() * 9000);
    current.push({
      id: 'sample_' + Date.now() + '_' + i,
      name: name,
      phone: `010-${Math.floor(2000 + Math.random() * 8000)}-${random4}`,
      phoneMasked: `010-****-${random4}`,
      attend: '현장참석',
      time: timeStr,
      timestamp: Date.now()
    });
  });

  localStorage.setItem('lucky_draw_entries', JSON.stringify(current));
  updateQrEntryCountDisplays();
  renderEntryTable();
  applyQrEntriesToDraw();
  showQrToast(`🎲 테스트용 샘플 참가자 10명이 생성되어 명단에 등록되었습니다!`);
}

// 실시간 토스트 알림창
let toastTimer = null;
function showQrToast(msg) {
  const toast = document.getElementById('qrToast');
  const msgEl = document.getElementById('qrToastMsg');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.style.display = 'flex';

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}



