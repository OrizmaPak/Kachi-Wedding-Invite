const cover = document.querySelector('#cover');
const invitation = document.querySelector('#invitation');
const headline = document.querySelector('#invite-title');
const bow = document.querySelector('.bow-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  queueNavigationUpdate();
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

function prepareAmbientMotion() {
  if (!('IntersectionObserver' in window)) return;

  const motion = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('has-motion', entry.isIntersecting);
    }
  }, { threshold: 0.15 });
  for (const section of invitation.querySelectorAll('.welcome, .scene')) {
    motion.observe(section);
  }
}

const navigation = document.querySelector('.invite-nav');
const navigationLinks = Array.from(navigation.querySelectorAll('nav a'), (link) => ({
  link,
  section: document.querySelector(link.hash),
}));
const scrollScenes = Array.from(document.querySelectorAll('[data-reveal]'));
const lastSceneStyle = new WeakMap();
let scrollFrame;

function documentTop(element) {
  let top = 0;
  for (let ancestor = element; ancestor; ancestor = ancestor.offsetParent) {
    top += ancestor.offsetTop;
  }
  return top;
}

function updateScrollScenes() {
  if (reducedMotion.matches || invitation.inert) return;

  const height = window.innerHeight;
  const scrollY = window.scrollY;
  const ribbonTop = navigation.getBoundingClientRect().top;
  const topEdge = ribbonTop <= 1 ? navigation.offsetHeight : 0;
  const fadeDistance = Math.min(218, Math.max(112, height * 0.23));

  // Measure the layout before writes so the movement never alters its own trigger point.
  const states = scrollScenes.map((element) => {
    const top = documentTop(element) - scrollY;
    const bottom = top + element.offsetHeight;
    const fromBelow = (height - top) / fadeDistance;
    const fromAbove = (bottom - topEdge) / fadeDistance;
    const progress = Math.min(1, Math.max(0, Math.min(fromAbove, fromBelow)));
    const eased = progress * progress * (3 - 2 * progress);
    const direction = fromAbove < fromBelow ? -1 : 1;
    return { element, eased, direction };
  });

  for (const { element, eased, direction } of states) {
    const opacity = eased.toFixed(3);
    const drift = ((1 - eased) * direction * 32).toFixed(1);
    const blur = (Math.pow(1 - eased, 1.4) * 6).toFixed(1);
    const styleKey = opacity + ':' + drift + ':' + blur;
    if (lastSceneStyle.get(element) === styleKey) continue;

    element.style.setProperty('--scene-opacity', opacity);
    element.style.setProperty('--scene-shift', drift === '0.0' ? 'none' : 'translateY(' + drift + 'px)');
    element.style.setProperty('--scene-blur', blur === '0.0' ? 'none' : 'blur(' + blur + 'px)');
    lastSceneStyle.set(element, styleKey);
  }
}

function updateNavigation() {
  scrollFrame = undefined;
  updateScrollScenes();
  const threshold = navigation.offsetHeight + 48;
  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = documentHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / documentHeight)) : 0;
  const atEnd = documentHeight > 0 && documentHeight - window.scrollY <= 3;
  const active = atEnd
    ? navigationLinks.at(-1)
    : navigationLinks.findLast(({ section }) => section.getBoundingClientRect().top <= threshold);

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
reducedMotion.addEventListener('change', queueNavigationUpdate);
invitation.addEventListener('toggle', queueNavigationUpdate, true);
prepareAmbientMotion();
queueNavigationUpdate();

const albumTrack = document.querySelector('#album-track');
const photoPrints = Array.from(albumTrack.querySelectorAll('.photo-print'));
const albumControls = Array.from(document.querySelectorAll('[data-album-step]'));

function updateAlbumControls() {
  const maxScroll = albumTrack.scrollWidth - albumTrack.clientWidth;
  albumControls[0].disabled = albumTrack.scrollLeft <= 1;
  albumControls[1].disabled = albumTrack.scrollLeft >= maxScroll - 1;
}

for (const button of albumControls) {
  button.addEventListener('click', () => {
    const printStep = photoPrints[1].offsetLeft - photoPrints[0].offsetLeft;
    albumTrack.scrollBy({
      left: Number(button.dataset.albumStep) * printStep,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  });
}
albumTrack.addEventListener('scroll', updateAlbumControls, { passive: true });
window.addEventListener('resize', updateAlbumControls);
updateAlbumControls();

const photoViewer = document.querySelector('.photo-viewer');
const viewerImage = photoViewer.querySelector('img');
const viewerCaption = photoViewer.querySelector('figcaption');
const viewerCount = document.querySelector('#photo-viewer-count');
let photoIndex = 0;
let photoTrigger;

function displayPhoto(index) {
  photoIndex = (index + photoPrints.length) % photoPrints.length;
  const photo = photoPrints[photoIndex];
  viewerImage.src = photo.href;
  viewerImage.alt = photo.querySelector('img').alt;
  viewerCaption.textContent = photo.querySelector('span').textContent;
  viewerCount.textContent = (photoIndex + 1) + ' of ' + photoPrints.length;
}

for (const [index, photo] of photoPrints.entries()) {
  photo.addEventListener('click', (event) => {
    if (typeof photoViewer.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    photoTrigger = photo;
    displayPhoto(index);
    photoViewer.showModal();
  });
}
for (const button of photoViewer.querySelectorAll('[data-photo-step]')) {
  button.addEventListener('click', () => displayPhoto(photoIndex + Number(button.dataset.photoStep)));
}
photoViewer.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    displayPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
photoViewer.querySelector('.photo-close').addEventListener('click', () => photoViewer.close());
photoViewer.addEventListener('click', (event) => {
  if (event.target === photoViewer) photoViewer.close();
});
photoViewer.addEventListener('close', () => photoTrigger?.focus({ preventScroll: true }));
