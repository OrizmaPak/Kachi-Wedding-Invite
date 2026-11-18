const cover = document.querySelector('#cover');
const invitation = document.querySelector('#invitation');
const headline = document.querySelector('#invite-title');
const bow = document.querySelector('.bow-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const countdown = document.querySelector('.countdown');
const countdownGrid = document.querySelector('.countdown-grid');
const countdownComplete = document.querySelector('#countdown-complete');

const ceremony = new Date('2026-12-12T10:00:00+01:00');
const countdownFields = ['days', 'hours', 'minutes', 'seconds'].map(
  (unit) => document.getElementById(unit),
);
let countdownTimer;

function updateCountdown() {
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((ceremony.getTime() - now) / 1000));
  if (remaining === 0) {
    window.clearInterval(countdownTimer);
    countdownGrid.hidden = true;
    countdownComplete.hidden = false;
    const endOfWeddingDay = new Date('2026-12-13T00:00:00+01:00');
    if (now >= endOfWeddingDay.getTime()) {
      countdownComplete.textContent = 'Thank you for celebrating with us.';
    }
    return;
  }
  const parts = [
    Math.floor(remaining / 86400),
    Math.floor((remaining % 86400) / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ];
  for (const [index, field] of countdownFields.entries()) {
    field.textContent = String(parts[index]).padStart(2, '0');
  }
}

let openingTimer;

function revealInvitation() {
  if (cover.hidden) return;

  window.clearTimeout(openingTimer);
  cover.hidden = true;
  invitation.inert = false;
  invitation.classList.remove('is-sealed');
  invitation.classList.add('is-revealing');
  window.scrollTo({ top: 0, behavior: 'instant' });
  headline.focus({ preventScroll: true });
  countdownTimer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
}

function showCover({ focusBow = false } = {}) {
  window.clearInterval(countdownTimer);
  invitation.inert = true;
  invitation.classList.remove('is-revealing');
  invitation.classList.add('is-sealed');
  cover.classList.remove('is-opening');
  cover.hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focusBow) bow.focus({ preventScroll: true });
}

bow.addEventListener('click', () => {
  if (cover.classList.contains('is-opening')) return;

  if (reducedMotion.matches) {
    revealInvitation();
    return;
  }

  cover.classList.add('is-opening');
  const duration = Number.parseFloat(getComputedStyle(cover).getPropertyValue('--opening-duration'));
  openingTimer = window.setTimeout(revealInvitation, duration + 100);
});

cover.addEventListener('animationend', (event) => {
  if (event.target === cover && event.animationName === 'lift-cover') revealInvitation();
});

document.querySelector('#replay').addEventListener('click', () => {
  if (location.hash) history.replaceState(null, '', location.href.split('#')[0]);
  showCover({ focusBow: true });
});

const rsvpForm = document.querySelector('#rsvp-form');
const feedback = document.querySelector('#form-feedback');

rsvpForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const response = new FormData(rsvpForm);
  const name = response.get('name').trim();
  if (!name) {
    document.querySelector('#guest-name').value = '';
    rsvpForm.reportValidity();
    return;
  }

  const attendance = response.get('attendance') === 'yes' ? 'Joyfully accepts' : 'Regretfully declines';
  feedback.textContent = 'Thanks, ' + name + '. Your sample response was “' + attendance + '.”';
  feedback.hidden = false;
  rsvpForm.reset();
});

function linkedSection() {
  const target = document.getElementById(location.hash.slice(1));
  return target?.closest('#invitation') ? target : null;
}

function revealLinkedSection() {
  const target = linkedSection();
  if (!cover.hidden && target) {
    revealInvitation();
    target.scrollIntoView({ behavior: 'instant' });
  }
}

window.addEventListener('hashchange', revealLinkedSection);
if (linkedSection()) {
  countdownTimer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
} else {
  showCover();
}

function prepareScrollReveals() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;

  const entrance = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('reveal-ready');
      entrance.unobserve(entry.target);
    }
  }, { threshold: 0.12 });

  for (const element of document.querySelectorAll('[data-reveal]')) {
    if (element.getBoundingClientRect().bottom < 0) continue;
    element.classList.add('reveal-ready');
    entrance.observe(element);
  }

  const petals = new IntersectionObserver(([entry]) => {
    countdown.classList.toggle('has-drift', entry.isIntersecting);
  }, { threshold: 0.15 });
  petals.observe(countdown);
}

const navigation = document.querySelector('.invite-nav');
const navigationLinks = Array.from(navigation.querySelectorAll('nav a'), (link) => ({
  link,
  section: document.querySelector(link.hash),
}));
let scrollFrame;

function updateNavigation() {
  scrollFrame = undefined;
  const threshold = navigation.offsetHeight + 32;
  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = documentHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / documentHeight)) : 0;
  const active = navigationLinks.findLast(({ section }) => section.getBoundingClientRect().top <= threshold);

  navigation.style.setProperty('--progress', progress);
  for (const item of navigationLinks) {
    if (item === active) item.link.setAttribute('aria-current', 'location');
    else item.link.removeAttribute('aria-current');
  }
}

function queueNavigationUpdate() {
  if (scrollFrame === undefined) scrollFrame = window.requestAnimationFrame(updateNavigation);
}

window.addEventListener('scroll', queueNavigationUpdate, { passive: true });
window.addEventListener('resize', queueNavigationUpdate);
invitation.addEventListener('toggle', queueNavigationUpdate, true);
prepareScrollReveals();
queueNavigationUpdate();
