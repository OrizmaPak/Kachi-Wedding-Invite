const loginForm = document.querySelector('#responses-login');
const passwordInput = document.querySelector('#responses-password');
const errorMessage = document.querySelector('#responses-error');
const content = document.querySelector('#responses-content');
const responseList = document.querySelector('#responses-list');
const responseCount = document.querySelector('#responses-count');
const downloadButton = document.querySelector('#download-responses');
let loadedResponses = [];

function responseTitle(text) {
  return text.match(/^Full name:\s*(.+)$/m)?.[1] || 'Guest response';
}

function showResponses(responses) {
  loadedResponses = responses;
  responseList.replaceChildren();
  responseCount.textContent = `${responses.length} ${responses.length === 1 ? 'response' : 'responses'}`;

  if (!responses.length) {
    const empty = document.createElement('p');
    empty.className = 'responses-empty';
    empty.textContent = 'No responses have been received yet.';
    responseList.append(empty);
    return;
  }

  for (const response of responses) {
    const card = document.createElement('article');
    card.className = 'response-card';
    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = responseTitle(response.content);
    const time = document.createElement('time');
    const date = new Date(response.submittedAt);
    time.dateTime = response.submittedAt;
    time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
    const pre = document.createElement('pre');
    pre.textContent = response.content;
    header.append(title, time);
    card.append(header, pre);
    responseList.append(card);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  const button = loginForm.querySelector('button');
  button.disabled = true;

  try {
    const result = await fetch('/api/rsvp', { headers: { 'X-Admin-Password': passwordInput.value } });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error || 'Unable to load responses.');
    showResponses(data.responses || []);
    loginForm.hidden = true;
    content.hidden = false;
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

downloadButton.addEventListener('click', () => {
  const text = loadedResponses.map((item, index) => `RESPONSE ${index + 1}\n${'='.repeat(32)}\n${item.content}`).join('\n\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ginikachi-godwin-rsvps-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
});
