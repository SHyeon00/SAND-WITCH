// 전국 샌드위치 매장 데이터
const STORES = [
  { img: "store_TeddyBeurre", name: "테디뵈르",   loc: "서울 용산구" },
  { img: "store_Recette",     name: "흐세트",     loc: "전남 여수시" },
  { img: "store_Tartine",     name: "타르틴",     loc: "경기도 성남시" },
  { img: "store_JoeSandwich", name: "죠샌드위치", loc: "서울 송파구" },
  { img: "store_LaCroute",    name: "라쿠르뜨",   loc: "서울 강서구" },
  { img: "store_Bittersalt",  name: "비터솔트",   loc: "서울 잠실" },
  { img: "store_Aslice",      name: "어슬라이스", loc: "서울 마포구" },
  { img: "store_Andmeal",     name: "앤드밀",     loc: "서울 성동구" },
  { img: "store_October",     name: "악토버",     loc: "서울 판교" },
  { img: "store_Littleaus",   name: "리틀오스",   loc: "부산 광안리" },
];

const card = (s) => `
  <figure class="store__card">
    <img src="src/store/${s.img}.png" alt="${s.name}" />
    <div class="store__mask"></div>
    <figcaption class="store__caption">
      <span class="name">${s.name}</span>
      <span class="loc">${s.loc}</span>
    </figcaption>
  </figure>`;

// 두 벌을 이어붙여 seamless 무한 루프
document.getElementById("storeTrack").innerHTML =
  [...STORES, ...STORES].map(card).join("");

// #샌드위치 인스타 캐러셀 (윗줄: 좌 / 아랫줄: 우)
const insta = (n) => `<img src="src/insta/image%20${n}.png" alt="" />`;
const rowTop = [23, 24, 25, 26, 27, 28, 29];
const rowBottom = [30, 31, 32, 33, 34, 35, 36];
document.getElementById("instaRowTop").innerHTML =
  [...rowTop, ...rowTop].map(insta).join("");
document.getElementById("instaRowBottom").innerHTML =
  [...rowBottom, ...rowBottom].map(insta).join("");

// ── 이스터에그: "order" 입력 시 샌드위치 폭죽 ──────────────
const EGG_IMAGES = Array.from(
  { length: 12 },
  (_, i) => `src/sandwich/image%20${i + 2}.png`
);
const eggLayer = document.getElementById("eggLayer");

function burstSandwiches() {
  const cx = window.innerWidth / 2;
  const baseY = window.innerHeight;
  const count = 26;

  for (let i = 0; i < count; i++) {
    const img = document.createElement("img");
    img.src = EGG_IMAGES[(Math.random() * EGG_IMAGES.length) | 0];
    img.className = "egg-piece";
    const size = 60 + Math.random() * 90;
    img.style.width = size + "px";
    eggLayer.appendChild(img);

    // 하단 중앙에서 발사 (포물선)
    let x = cx + (Math.random() * 120 - 60) - size / 2;
    let y = baseY;
    let vx = Math.random() * 26 - 13;      // 좌우 부채꼴 확산
    let vy = -(21 + Math.random() * 13);   // 위로 튀어오름
    const g = 0.5;                          // 중력
    let rot = Math.random() * 360;
    const vr = Math.random() * 14 - 7;      // 회전 속도

    (function frame() {
      vy += g;
      x += vx;
      y += vy;
      rot += vr;
      img.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      // 화면 아래로 완전히 내려가면 제거
      if (y - size > window.innerHeight) {
        img.remove();
        return;
      }
      requestAnimationFrame(frame);
    })();
  }
}

// 어떤 화면에서든 "order" 시퀀스 감지
let typedBuf = "";
window.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
    return;
  if (e.key.length !== 1) return;
  typedBuf = (typedBuf + e.key.toLowerCase()).slice(-6);
  if (typedBuf.endsWith("order")) {
    typedBuf = "";
    burstSandwiches();
  }
});

// ── 3~5페이지 연속 낙하 + 5페이지 바닥 스택(중력, 자유 위치) ──
(function rainEngine() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const layer = document.getElementById("rainLayer");

  // 모바일/웹 분기 — 모바일은 개수·속도 줄여 성능 확보
  const isMobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
  const G = isMobile ? 0.07 : 0.12;      // 중력 가속도 (모바일 더 완만)
  const VMAX = isMobile ? 3.2 : 6.5;     // 종단 속도 (모바일 느리게)
  const MAX = isMobile ? 26 : 80;        // 동시 최대 조각 수 (모바일 적게)
  const SPAWN_MS = isMobile ? 460 : 210; // 생성 간격 (모바일 드물게)
  const OVERLAP = 0.25;  // 쌓일 때 아래 조각에 겹쳐 들어가는 비율(프레임 여백 보정)

  // 좌표는 컨테이너(3p top ~ 5p bottom) 기준. 바닥 = 컨테이너 하단 = 5페이지 바닥
  let W, H, floorY;
  function reset() {
    W = layer.clientWidth || window.innerWidth;
    H = window.innerHeight;
    floorY = layer.clientHeight || 4 * H;
  }
  reset();
  window.addEventListener("resize", reset);

  // 모든 조각: {el,x,size,y,vy,rot,vr,resting,timer}
  const pieces = [];

  // 3~5페이지 영역이 화면에 보이는 동안만 생성
  const rainOn = () => {
    const r = layer.getBoundingClientRect();
    return r.top < H && r.bottom > 0;
  };

  function spawn() {
    if (pieces.length >= MAX) return;
    const size = 55 + Math.random() * 55; // 기존 대비 ~20% 확대
    const x = Math.random() * (W - size); // 랜덤 가로 위치
    const el = document.createElement("img");
    el.src = EGG_IMAGES[(Math.random() * EGG_IMAGES.length) | 0];
    el.className = "rain-piece";
    el.style.width = size + "px";
    layer.appendChild(el);
    const p = {
      el, x, size,
      h: size * 0.6, // 실제 렌더 높이(로드 후 보정) — 스택 계산에 사용
      y: -size - Math.random() * 80, // 컨테이너(3p) 맨 위에서 시작
      vy: 0.4 + Math.random() * 0.8,
      rot: Math.random() * 360,
      vr: (Math.random() * 4 - 2) || 1.4, // 회전 각속도(도/프레임)
      resting: false,
      timer: null,
    };
    // 프레임(정사각 폭)이 아니라 실제 이미지 비율로 높이를 잡아 붕 뜸 방지
    const setH = () => {
      if (el.naturalWidth) p.h = size * (el.naturalHeight / el.naturalWidth);
    };
    if (el.complete) setH();
    else el.addEventListener("load", setH);
    pieces.push(p);
  }

  const draw = (p) =>
    (p.el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.rot}deg)`);

  // x 구간에서 겹치는 조각들 위 or 바닥에 착지할 top 계산
  function restTopFor(p) {
    let top = floorY - p.h;
    for (const o of pieces) {
      if (o === p || !o.resting) continue;
      if (p.x < o.x + o.size && o.x < p.x + p.size) { // 수평 겹침
        const cand = o.y - p.h * (1 - OVERLAP); // 아래 조각에 살짝 겹쳐 얹힘
        if (cand < top) top = cand;
      }
    }
    return top;
  }

  // 아래가 사라졌을 때 쌓인 조각들 중력으로 재정착 (아래→위 순서)
  function settle() {
    const rest = pieces.filter((p) => p.resting).sort((a, b) => b.y - a.y);
    for (const p of rest) {
      let top = floorY - p.h;
      for (const o of rest) {
        if (o === p) continue;
        if (o.y > p.y && p.x < o.x + o.size && o.x < p.x + p.size) {
          const cand = o.y - p.h * (1 - OVERLAP);
          if (cand < top) top = cand;
        }
      }
      if (p.y < top - 0.5) { // 아래에 빈 공간 → 부드럽게 내려앉음
        p.y = top;
        p.el.style.transition = "transform 0.4s cubic-bezier(.4,.7,.3,1)";
        draw(p);
        const el = p.el;
        setTimeout(() => (el.style.transition = ""), 430);
      }
    }
  }

  function removePiece(p) {
    const i = pieces.indexOf(p);
    if (i < 0) return;
    pieces.splice(i, 1);
    if (p.el.parentNode) p.el.remove();
    settle(); // 위에 얹혀있던 것들 중력으로 내려옴
  }

  let lastSpawn = 0;
  function tick(t) {
    if (rainOn() && t - lastSpawn > SPAWN_MS) {
      spawn();
      lastSpawn = t;
    }
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.resting) continue; // 정착된 건 건드리지 않음(transition 보존)
      p.vy = Math.min(p.vy + G, VMAX);
      p.y += p.vy;
      p.rot += p.vr;
      const top = restTopFor(p); // 5페이지 바닥(컨테이너 하단)에 항상 쌓임
      if (p.y >= top) {
        p.y = top;
        p.resting = true;
        draw(p);
        if (!p.timer) p.timer = setTimeout(() => removePiece(p), 3000);
        continue;
      }
      draw(p);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ── 샌드위치 만들기: Suika식 재료 드롭 (matter.js) ──────────
(function maker() {
  if (!window.Matter) return;
  const { Engine, Bodies, Composite, Body } = Matter;
  const board = document.getElementById("makerBoard");
  const tools = document.getElementById("makerTools");
  if (!board || !tools) return;

  const W = 560, H = 560;      // 놀이판 픽셀 (.maker__stage 와 동일)
  const FLOOR_Y = 458;         // 아래 빵(받침) 살짝 안쪽 — 재료가 겹쳐 쌓임
  const DROP_Y = 140;          // 위에서 떨어뜨림
  const WALL_L = 60, WALL_R = 500;

  // r = 충돌 반경 비율. 납작한 재료(치즈·토마토·햄)는 작게 잡아 서로 겹쳐 쌓이게 함
  const ING = {
    tomato:  { img: "tomata_illustration",   w: 118, asp: 1,       r: 0.28 },
    cheese:  { img: "cheese_illustration",   w: 142, asp: 318 / 421, r: 0.22 },
    lettuce: { img: "lecttuce_illustration", w: 128, asp: 246 / 249, r: 0.32 },
    ham:     { img: "image 38",              w: 128, asp: 181 / 249, r: 0.22 },
    shrimp:  { img: "shrimp_illustration",   w: 108, asp: 1,       r: 0.32 },
    egg:     { img: "egg_illustration",      w: 100, asp: 1,       r: 0.34 },
  };
  const srcOf = (k) => `src/illustration/${ING[k].img.replace(/ /g, "%20")}.png`;

  const engine = Engine.create();
  engine.gravity.y = 1;

  const wOpt = { isStatic: true, restitution: 0.05, friction: 0.9 };
  Composite.add(engine.world, [
    Bodies.rectangle(W / 2, FLOOR_Y + 40, WALL_R - WALL_L + 120, 80, wOpt), // 바닥(빵)
    Bodies.rectangle(WALL_L - 20, H / 2, 40, H, wOpt),                       // 좌벽
    Bodies.rectangle(WALL_R + 20, H / 2, 40, H, wOpt),                       // 우벽
  ]);

  const pieces = [];
  const MAXP = 45;

  function drop(kind) {
    const cfg = ING[kind];
    if (!cfg) return;
    if (pieces.length >= MAXP) {
      const old = pieces.shift();
      Composite.remove(engine.world, old.body);
      old.el.remove();
    }
    const w = cfg.w, h = w * cfg.asp;
    const body = Bodies.circle(
      W / 2 + (Math.random() * 80 - 40),
      DROP_Y,
      w * cfg.r,
      { restitution: 0.15, friction: 0.8, frictionStatic: 1, density: 0.001 }
    );
    Body.setAngle(body, Math.random() * 0.5 - 0.25);
    Composite.add(engine.world, body);

    const el = document.createElement("img");
    el.className = "maker__piece";
    el.src = srcOf(kind);
    el.style.width = w + "px";
    board.appendChild(el);
    pieces.push({ body, el, w, h });
  }

  tools.querySelectorAll("[data-ing]").forEach((btn) =>
    btn.addEventListener("click", () => drop(btn.dataset.ing))
  );

  // 쌓인 재료 클릭 → 삭제
  function removeOne(p) {
    const i = pieces.indexOf(p);
    if (i < 0) return;
    pieces.splice(i, 1);
    Composite.remove(engine.world, p.body);
    p.el.remove();
  }
  board.addEventListener("click", (e) => {
    const el = e.target.closest(".maker__piece");
    if (!el) return;
    const p = pieces.find((x) => x.el === el);
    if (p) removeOne(p);
  });

  (function frame() {
    Engine.update(engine, 1000 / 60);
    for (const p of pieces) {
      const { x, y } = p.body.position;
      p.el.style.transform =
        `translate(${x - p.w / 2}px, ${y - p.h / 2}px) rotate(${p.body.angle}rad)`;
    }
    requestAnimationFrame(frame);
  })();
})();

// ── 상단 네비게이션: 클릭 이동 + 현재 위치 하이라이트 ──────
(function nav() {
  const btns = document.querySelectorAll("[data-nav]");
  const panels = document.querySelectorAll(".panel");

  btns.forEach((b) =>
    b.addEventListener("click", () => {
      const i = +b.dataset.nav;
      const y = panels[i].getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: "smooth" });
    })
  );

  function updateActive() {
    const i = Math.min(
      panels.length - 1,
      Math.max(0, Math.round(window.scrollY / window.innerHeight))
    );
    btns.forEach((b) =>
      b.classList.toggle("is-active", +b.dataset.nav === i)
    );
  }
  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive);
  updateActive();
})();
