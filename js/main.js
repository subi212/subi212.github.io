// Work-in-progress card: show an iOS-style bubble and type the message out.
(function () {
  const card = document.querySelector('.project--wip');
  if (!card) return;

  const output = card.querySelector('.wip-bubble-text');
  const message = card.querySelector('.wip-bubble-ghost').textContent;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TYPE_DELAY = 250; // wait for the bubble to pop in
  const CHAR_DELAY = 30;  // ms per character

  let timer = null;

  function open() {
    if (card.classList.contains('is-open')) return;
    card.classList.add('is-open');
    clearTimeout(timer);
    output.textContent = '';

    if (reduceMotion) {
      output.textContent = message;
      return;
    }

    output.classList.add('is-typing');
    let i = 0;
    const typeNext = () => {
      output.textContent = message.slice(0, ++i);
      if (i < message.length) {
        timer = setTimeout(typeNext, CHAR_DELAY);
      } else {
        timer = setTimeout(() => output.classList.remove('is-typing'), 1200);
      }
    };
    timer = setTimeout(typeNext, TYPE_DELAY);
  }

  function close() {
    clearTimeout(timer);
    card.classList.remove('is-open');
    output.classList.remove('is-typing');
    output.textContent = '';
  }

  // Mouse: open on hover, close on leave. Decided per pointer, not per device,
  // so it works on touchscreen laptops and anywhere a mouse is used.
  card.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') open();
  });
  card.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') close();
  });

  // Touch: tap toggles it
  let lastPointer = 'mouse';
  card.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
  card.addEventListener('click', () => {
    if (lastPointer !== 'mouse' && card.classList.contains('is-open')) close();
    else open();
  });

  // Keyboard only: a tap or click also focuses the card, and the click handler covers that
  card.addEventListener('focus', () => {
    if (card.matches(':focus-visible')) open();
  });
  card.addEventListener('blur', close);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  // Tapping elsewhere on a phone closes it
  document.addEventListener('click', (e) => {
    if (!card.contains(e.target)) close();
  });
})();

// Headline: rotate through job titles ("an Experience Designer", "a Product Designer", ...)
(function () {
  const rotator = document.querySelector('.role-rotator');
  if (!rotator) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const text = rotator.querySelector('.role-text');
  const roles = rotator.dataset.roles.split('|');

  const HOLD = 2500; // ms each title stays on screen
  const SWAP = 300;  // must match the .role-text transition

  let index = 0;

  function render(role) {
    // First word is the article ("a"/"an"); the rest is the italic title
    const space = role.indexOf(' ');
    text.textContent = role.slice(0, space + 1);
    const em = document.createElement('em');
    em.textContent = role.slice(space + 1);
    text.appendChild(em);
  }

  // Animate the width so the rest of the sentence slides instead of jumping
  function lockWidth() {
    rotator.style.width = text.offsetWidth + 'px';
  }

  function next() {
    text.classList.add('is-leaving');
    setTimeout(() => {
      index = (index + 1) % roles.length;
      render(roles[index]);
      lockWidth();
      text.classList.remove('is-leaving');
      text.classList.add('is-entering');
      text.offsetWidth; // apply the start position before animating in
      text.classList.remove('is-entering');
    }, SWAP);
  }

  document.fonts.ready.then(lockWidth);
  window.addEventListener('resize', lockWidth);
  setInterval(next, HOLD);
})();

// Avatar: runs away from the cursor (or finger) and drifts back home after a moment
(function () {
  const avatar = document.querySelector('.avatar');
  if (!avatar) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const area = avatar.parentElement;
  const NEAR = 70;       // px from the avatar's center that counts as "too close"
  const COOLDOWN = 250;  // ms between jumps, so it doesn't jitter
  const HOME_AFTER = 2500;

  let x = 0;
  let y = 0;
  let lastJump = -Infinity;
  let homeTimer = null;

  function place(rotate) {
    avatar.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  }

  function flee(px, py) {
    const now = performance.now();
    if (now - lastJump < COOLDOWN) return;
    lastJump = now;

    const r = avatar.getBoundingClientRect();
    const a = area.getBoundingClientRect();

    // Direction away from the pointer (random if it's dead center)
    let dx = r.left + r.width / 2 - px;
    let dy = r.top + r.height / 2 - py;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    } else {
      dx /= len;
      dy /= len;
    }

    // Allowed range, relative to the avatar's home spot
    const homeLeft = r.left - x;
    const minX = a.left - homeLeft;
    const maxX = a.right - homeLeft - r.width;
    const minY = -40;
    const maxY = 60;

    const dist = 90 + Math.random() * 60;
    let nx = x + dx * dist;
    let ny = y + dy * dist;
    // Cornered? Bounce the other way instead
    if (nx < minX || nx > maxX) nx = x - dx * dist;
    if (ny < minY || ny > maxY) ny = y - dy * dist;
    x = Math.min(maxX, Math.max(minX, nx));
    y = Math.min(maxY, Math.max(minY, ny));

    place((Math.random() - 0.5) * 30);

    clearTimeout(homeTimer);
    homeTimer = setTimeout(() => {
      x = 0;
      y = 0;
      place(0);
    }, HOME_AFTER);
  }

  // Mouse: jump as soon as the cursor gets close, before it even touches
  let pending = null;
  document.addEventListener('mousemove', (e) => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const r = avatar.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
      if (d < NEAR) flee(e.clientX, e.clientY);
    });
  });

  // Touch or a lucky click: get away on contact
  avatar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    lastJump = -Infinity;
    flee(e.clientX, e.clientY);
  });
})();
