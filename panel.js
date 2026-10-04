const $ = id => document.getElementById(id);
let currentArticle = null;
let currentResult = null;

function show(view) {
  for (const id of ['readerView','settingsView','libraryView']) $(id).hidden = id !== view;
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').className = error ? 'status error' : 'status';
}
function safeUrl(url) { try { const u = new URL(url); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }

async function activeArticle() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !safeUrl(tab.url)) throw new Error('Open an http or https article in the active tab, then try again.');
  let result;
  try { result = await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] }); }
  catch { throw new Error('Chrome could not read this tab. Reload the article and try again.'); }
  const article = result?.[0]?.result;
  if (!article?.text || article.text.length < 200) throw new Error('Could not find enough readable article text on this page.');
  return article;
}

async function refreshArticle() {
  try {
    currentArticle = await activeArticle();
    $('domain').textContent = currentArticle.domain;
    $('title').textContent = currentArticle.title;
    $('readTime').textContent = `${Math.max(1, Math.ceil(currentArticle.wordCount / 225))} min read`;
    $('sourceHint').textContent = 'Ready to turn this article into a useful brief.';
    status('');
  } catch (error) {
    currentArticle = null;
    $('domain').textContent = 'Current tab';
    $('title').textContent = 'Open an article to begin';
    $('readTime').textContent = '';
    $('sourceHint').textContent = 'Summarize the page you are reading in one click.';
    status(error.message, true);
  }
}

function renderResult(result) {
  $('tldrText').textContent = result.tldr;
  $('takeaways').replaceChildren(...result.takeaways.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('questions').replaceChildren(...result.questions.map(text => { const span = document.createElement('span'); span.className = 'question'; span.textContent = `ⓘ  ${text}`; return span; }));
  $('result').hidden = false;
}

$('summarizeBtn').addEventListener('click', async () => {
  $('summarizeBtn').disabled = true;
  $('result').hidden = true;
  status('Reading the article…');
  try {
    currentArticle = await activeArticle();
    $('domain').textContent = currentArticle.domain;
    $('title').textContent = currentArticle.title;
    $('readTime').textContent = `${Math.max(1, Math.ceil(currentArticle.wordCount / 225))} min read`;
    status('Creating your summary…');
    const { serviceMode = globalThis.BRIEFLY_SERVICE_URL ? 'shared' : 'own' } = await chrome.storage.local.get('serviceMode');
    const response = await chrome.runtime.sendMessage({ type: 'SUMMARIZE', mode: serviceMode, payload: { article: currentArticle, language: $('language').value, length: $('length').value } });
    if (!response?.ok) throw new Error(response?.error || 'Summary failed.');
    currentResult = response.result;
    renderResult(currentResult);
    status('');
  } catch (error) { status(error.message, true); }
  finally { $('summarizeBtn').disabled = false; }
});

$('copyBtn').addEventListener('click', async () => {
  if (!currentResult) return;
  const text = `${currentArticle.title}\n${currentArticle.url}\n\nTL;DR\n${currentResult.tldr}\n\nKey takeaways\n${currentResult.takeaways.map((x,i) => `${i+1}. ${x}`).join('\n')}`;
  try { await navigator.clipboard.writeText(text); status('Copied to clipboard.'); }
  catch { status('Could not copy. Please try again.', true); }
});
$('saveBtn').addEventListener('click', async () => {
  if (!currentResult || !currentArticle) return;
  const { saved = [] } = await chrome.storage.local.get('saved');
  const entry = { id: crypto.randomUUID(), title: currentArticle.title, url: currentArticle.url, domain: currentArticle.domain, summary: currentResult, savedAt: Date.now() };
  await chrome.storage.local.set({ saved: [entry, ...saved].slice(0, 50) });
  status('Saved locally.');
});
$('openBtn').addEventListener('click', () => { const url = safeUrl(currentArticle?.url); if (url) chrome.tabs.create({ url }); });
$('settingsBtn').addEventListener('click', async () => { const { geminiKey = '', serviceMode = globalThis.BRIEFLY_SERVICE_URL ? 'shared' : 'own' } = await chrome.storage.local.get(['geminiKey','serviceMode']); $('apiKey').value = geminiKey; $('serviceMode').value = serviceMode; updateServiceMode(); show('settingsView'); });
$('libraryBtn').addEventListener('click', async () => { await renderLibrary(); show('libraryView'); });
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => show('readerView')));
$('saveKeyBtn').addEventListener('click', async () => {
  const key = $('apiKey').value.trim();
  if (!key) { alert('Enter an API key first.'); return; }
  await chrome.storage.local.set({ geminiKey: key });
  $('apiKey').value = '';
  show('readerView'); status('API key saved locally.');
});
$('clearKeyBtn').addEventListener('click', async () => { await chrome.storage.local.remove('geminiKey'); $('apiKey').value = ''; show('readerView'); status('API key removed.'); });
function updateServiceMode() {
  const shared = $('serviceMode').value === 'shared';
  $('ownKeySettings').hidden = shared;
  $('sharedHint').hidden = !shared || Boolean(globalThis.BRIEFLY_SERVICE_URL);
}
$('serviceMode').addEventListener('change', async () => {
  await chrome.storage.local.set({ serviceMode: $('serviceMode').value });
  updateServiceMode();
});

async function renderLibrary() {
  const { saved = [] } = await chrome.storage.local.get('saved');
  const list = $('savedList'); list.replaceChildren();
  if (!saved.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No saved summaries yet.'; list.append(p); return; }
  for (const item of saved) {
    const card = document.createElement('div'); card.className = 'saved';
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${item.title}`);
    remove.addEventListener('click', async () => { const { saved: all = [] } = await chrome.storage.local.get('saved'); await chrome.storage.local.set({ saved: all.filter(x => x.id !== item.id) }); renderLibrary(); });
    const title = document.createElement('h2'); title.textContent = item.title;
    const summary = document.createElement('p'); summary.textContent = item.summary?.tldr || '';
    const link = document.createElement('a'); link.textContent = 'Open original ↗'; link.href = safeUrl(item.url) || '#'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    card.append(remove, title, summary, link); list.append(card);
  }
}

Promise.all([chrome.storage.local.get(['language','length']), refreshArticle()]).then(([settings]) => {
  if (settings.language) $('language').value = settings.language;
  if (settings.length) $('length').value = settings.length;
});
for (const id of ['language','length']) $(id).addEventListener('change', () => chrome.storage.local.set({ [id]: $(id).value }));
chrome.tabs.onActivated.addListener(() => { $('result').hidden = true; currentResult = null; refreshArticle(); });
chrome.tabs.onUpdated.addListener((_id, change, tab) => { if (change.status === 'complete' && tab.active) { $('result').hidden = true; currentResult = null; refreshArticle(); } });

/* ── Ripple + click feedback ── */
function createRipple(e, btn) {
  const circle = document.createElement('span');
  circle.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
  circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}

/* Ripple on all clickable buttons */
document.addEventListener('click', e => {
  const btn = e.target.closest('.actions button, .primary, .icon');
  if (btn) createRipple(e, btn);
});

/* Click feedback with text change + green flash for action buttons */
function flashButton(btn, feedbackText) {
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${feedbackText}`;
  btn.classList.add('clicked');
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.classList.remove('clicked');
  }, 1400);
}

$('copyBtn').addEventListener('click', () => flashButton($('copyBtn'), 'Copied!'));
$('saveBtn').addEventListener('click', () => flashButton($('saveBtn'), 'Saved!'));
