const cover = document.querySelector('#cover');
const invitation = document.querySelector('#invitation');
const headline = document.querySelector('#invite-title');
const openButtons = document.querySelectorAll('[data-open]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const ceremony = new Date('2027-02-20T16:00:00+01:00');
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

function revealInvitation() {
  if (!invitation.hidden) return;

  cover.hidden = true;
  invitation.hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  headline.focus({ preventScroll: true });
  countdownTimer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
}

function openInvitation() {
  if (cover.hidden || cover.classList.contains('is-preparing')) return;

  if (reducedMotion.matches) {
    revealInvitation();
    return;
  }

  cover.classList.add('is-preparing');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      cover.classList.add('is-opening');
      window.setTimeout(revealInvitation, 740);
    });
  });
}

for (const button of openButtons) {
  button.addEventListener('click', openInvitation);
}

document.querySelector('#replay').addEventListener('click', () => {
  window.clearInterval(countdownTimer);
  cover.classList.remove('is-opening', 'is-preparing');
  invitation.hidden = true;
  cover.hidden = false;
  if (location.hash) history.replaceState(null, '', location.href.split('#')[0]);
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('.open-button').focus({ preventScroll: true });
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

function revealLinkedSection() {
  const target = document.getElementById(location.hash.slice(1));
  if (invitation.hidden && target?.closest('#invitation')) {
    revealInvitation();
    target.scrollIntoView({ behavior: 'instant' });
  }
}

window.addEventListener('hashchange', revealLinkedSection);
revealLinkedSection();
