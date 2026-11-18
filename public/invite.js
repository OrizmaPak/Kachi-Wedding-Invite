const cover = document.querySelector('#cover');
const invitation = document.querySelector('#invitation');
const headline = document.querySelector('#invite-title');
const bow = document.querySelector('.bow-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const ceremony = new Date('2026-12-12T10:00:00+01:00');
const countdownFields = ['days', 'hours', 'minutes', 'seconds'].map(
  (unit) => document.getElementById(unit),
);
let countdownTimer;

function updateCountdown() {
  const remaining = Math.max(0, Math.floor((ceremony.getTime() - Date.now()) / 1000));
  const parts = [
    Math.floor(remaining / 86400),
    Math.floor((remaining % 86400) / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ];
  for (const [index, field] of countdownFields.entries()) {
    field.textContent = String(parts[index]).padStart(2, '0');
  }
  if (remaining === 0) window.clearInterval(countdownTimer);
}

let openingTimer;

function revealInvitation() {
  if (cover.hidden) return;

  window.clearTimeout(openingTimer);
  cover.hidden = true;
  invitation.inert = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  headline.focus({ preventScroll: true });
  countdownTimer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
}

function showCover({ focusBow = false } = {}) {
  window.clearInterval(countdownTimer);
  invitation.inert = true;
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
  openingTimer = window.setTimeout(revealInvitation, 1440);
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
