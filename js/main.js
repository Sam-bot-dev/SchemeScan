// ─── UI HELPERS ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const { ProfileAgent, SchemeRetrievalAgent, DocumentAgent, ConflictAgent, RecommendationAgent, ChecklistAgent, ChatAgent } = window.Agents;

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<)(.+)/, '<p>$1')
    .replace(/([^>])$/, '$1</p>');
}

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type='info') {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:var(--card);border:1px solid var(--border);border-radius:8px;
    padding:10px 20px;font-size:13px;z-index:9999;color:var(--text);
    box-shadow:var(--shadow);animation:fadeUp 0.3s ease;
    ${type==='success'?'border-color:var(--accent3);color:var(--accent3);':''}
    ${type==='error'?'border-color:var(--accent5);color:var(--accent5);':''}
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function navigate(view) {
  State.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = $('view-' + view);
  if (el) el.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (nav) nav.classList.add('active');

  if (view === 'browse') renderBrowse();
  if (view === 'recommend') renderRecommendations();
  if (view === 'bookmarks') renderBookmarks();
  if (view === 'home') renderHome();
  if (view === 'conflicts') renderConflicts();
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function renderHome() {
  const profile = ProfileAgent.load();
  $('home-profile').textContent = ProfileAgent.getSummary();
  $('home-scheme-count').textContent = State.schemes.length.toLocaleString();
  $('home-bookmarks-count').textContent = State.bookmarks.length;

  const cats = {};
  State.schemes.forEach(s => s.category.split(',').forEach(c => { const cc=c.trim(); cats[cc]=(cats[cc]||0)+1; }));
  $('home-cats-count').textContent = Object.keys(cats).length;

  // Top recommendations preview
  const recs = RecommendationAgent.getTop(3);
  const container = $('home-recs');
  container.innerHTML = recs.map(s => `
    <div class="scheme-card" onclick="openScheme('${esc(s.slug)}')">
      <div class="scheme-meta">
        <span class="tag ${s.level.toLowerCase()}">${s.level}</span>
        <span class="tag cat">${s.category.split(',')[0].trim()}</span>
        ${s._score ? `<span class="tag" style="color:var(--accent4);border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.08)">${s._score}% match</span>` : ''}
      </div>
      <div class="scheme-name">${esc(s.name)}</div>
      <div class="scheme-snippet">${esc((s.benefits||'').slice(0,100))}…</div>
    </div>
  `).join('');
}

// ─── BROWSE ───────────────────────────────────────────────────────────────────
function renderBrowse() {
  const query = State.searchQuery;
  const cat = State.searchCat;
  const level = State.searchLevel;

  const results = SchemeRetrievalAgent.search(query, { category: cat, level });
  const total = results.length;
  const perPage = State.schemePageSize;
  const pages = Math.ceil(total / perPage);
  const page = Math.max(1, Math.min(State.searchPage, pages));
  const start = (page - 1) * perPage;
  const slice = results.slice(start, start + perPage);

  $('browse-count').textContent = `${total.toLocaleString()} schemes`;

  const grid = $('scheme-grid');
  grid.innerHTML = slice.map(s => `
    <div class="scheme-card" onclick="openScheme('${esc(s.slug)}')">
      <div class="scheme-meta">
        <span class="tag ${s.level.toLowerCase()}">${s.level}</span>
        <span class="tag cat">${s.category.split(',')[0].trim()}</span>
      </div>
      <div class="scheme-name">${esc(s.name)}</div>
      <div class="scheme-snippet">${esc((s.benefits||'').slice(0,120))}…</div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">🔍</div><h3>No schemes found</h3><p>Try different keywords</p></div>';

  // Pagination
  const pag = $('pagination');
  if (pages <= 1) { pag.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="changePage(${page-1})" ${page===1?'disabled':''}>‹</button>`;
  const range = [];
  if (pages <= 7) { for(let i=1;i<=pages;i++) range.push(i); }
  else {
    range.push(1);
    if (page > 3) range.push('…');
    for (let i=Math.max(2,page-1); i<=Math.min(pages-1,page+1); i++) range.push(i);
    if (page < pages-2) range.push('…');
    range.push(pages);
  }
  range.forEach(r => {
    if (r === '…') html += `<span class="page-info">…</span>`;
    else html += `<button class="page-btn ${r===page?'active':''}" onclick="changePage(${r})">${r}</button>`;
  });
  html += `<button class="page-btn" onclick="changePage(${page+1})" ${page===pages?'disabled':''}>›</button>`;
  html += `<span class="page-info">${start+1}–${Math.min(start+perPage,total)} of ${total.toLocaleString()}</span>`;
  pag.innerHTML = html;
}

function changePage(p) { State.searchPage = p; renderBrowse(); $('scheme-grid').scrollIntoView({behavior:'smooth'}); }

function doSearch() {
  State.searchQuery = $('search-input').value.trim();
  State.searchCat = $('filter-cat').value;
  State.searchLevel = $('filter-level').value;
  State.searchPage = 1;
  renderBrowse();
}

// ─── SCHEME MODAL ─────────────────────────────────────────────────────────────
function openScheme(slug) {
  const scheme = SchemeRetrievalAgent.getBySlug(slug);
  if (!scheme) return;
  State.selectedScheme = scheme;

  const { docs, steps } = DocumentAgent.buildChecklist(scheme);
  const cl = ChecklistAgent.get(slug);
  const prog = ChecklistAgent.getProgress(slug, docs.length + steps.length);
  const bookmarked = isBookmarked(slug);

  const modal = $('scheme-modal');
  $('modal-title').textContent = scheme.name;

  $('modal-meta').innerHTML = `
    <span class="tag ${scheme.level.toLowerCase()}">${scheme.level}</span>
    ${scheme.category.split(',').slice(0,3).map(c => `<span class="tag cat">${c.trim()}</span>`).join('')}
    ${scheme.tags ? scheme.tags.split(',').slice(0,3).map(t => `<span class="tag" style="color:var(--text3);border-color:var(--border)">${t.trim()}</span>`).join('') : ''}
  `;

  $('modal-body-content').innerHTML = `
    ${prog.total > 0 ? `
      <div class="modal-section">
        <h3>Your Progress</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
          <span style="font-size:12px;color:var(--text3)">${prog.done}/${prog.total} done (${prog.pct}%)</span>
        </div>
      </div>
    ` : ''}

    <div class="modal-section">
      <h3>About the Scheme</h3>
      <p>${esc(scheme.details||'').slice(0,600)}${scheme.details?.length > 600 ? '…' : ''}</p>
    </div>

    <div class="modal-section">
      <h3>Benefits</h3>
      <p>${esc(scheme.benefits||'Not specified')}</p>
    </div>

    <div class="modal-section">
      <h3>Eligibility</h3>
      <p>${esc(scheme.eligibility||'Not specified')}</p>
    </div>

    ${steps.length > 0 ? `
    <div class="modal-section">
      <h3>Application Steps — Checklist</h3>
      ${steps.map((step, i) => {
        const idx = i;
        const done = cl.checked.includes(idx);
        return `
          <div class="checklist-item ${done?'done':''}" id="cl-step-${i}">
            <div class="checklist-cb ${done?'checked':''}" onclick="toggleCL('${esc(slug)}', ${idx}, 'step', ${i})">
              ${done ? '✓' : ''}
            </div>
            <div class="checklist-text ${done?'done':''}">Step ${i+1}: ${esc(step.slice(0,200))}</div>
          </div>`;
      }).join('')}
    </div>
    ` : ''}

    ${docs.length > 0 ? `
    <div class="modal-section">
      <h3>Documents Required — Checklist</h3>
      ${docs.map((doc, i) => {
        const idx = steps.length + i;
        const done = cl.checked.includes(idx);
        return `
          <div class="checklist-item ${done?'done':''}" id="cl-doc-${i}">
            <div class="checklist-cb ${done?'checked':''}" onclick="toggleCL('${esc(slug)}', ${idx}, 'doc', ${i})">
              ${done ? '✓' : ''}
            </div>
            <div class="checklist-text ${done?'done':''}">📄 ${esc(doc)}</div>
          </div>`;
      }).join('')}
    </div>
    ` : ''}
  `;

  $('modal-bookmark-btn').innerHTML = bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
  $('modal-bookmark-btn').onclick = () => {
    toggleBookmark(slug);
    $('modal-bookmark-btn').innerHTML = isBookmarked(slug) ? '🔖 Bookmarked' : '🔖 Bookmark';
    showToast(isBookmarked(slug) ? 'Bookmarked!' : 'Removed from bookmarks', 'success');
  };

  $('modal-ask-btn').onclick = () => {
    closeModal();
    navigate('chat');
    setTimeout(() => {
      $('chat-textarea').value = `Tell me more about the "${scheme.name}" scheme and how I can apply.`;
      $('chat-textarea').focus();
    }, 100);
  };

  modal.classList.add('open');
}

function toggleCL(slug, idx, type, visualIdx) {
  const data = ChecklistAgent.toggle(slug, idx);
  const done = data.checked.includes(idx);
  const prefix = type === 'step' ? 'cl-step-' : 'cl-doc-';
  const item = document.getElementById(prefix + visualIdx);
  if (item) {
    item.classList.toggle('done', done);
    item.querySelector('.checklist-cb').classList.toggle('checked', done);
    item.querySelector('.checklist-cb').textContent = done ? '✓' : '';
    item.querySelector('.checklist-text').classList.toggle('done', done);
  }
}

function closeModal() { $('scheme-modal').classList.remove('open'); }

// ─── RECOMMENDATIONS ──────────────────────────────────────────────────────────
function renderRecommendations() {
  const profile = ProfileAgent.load();
  const hasProfile = !!profile.name;
  const recs = RecommendationAgent.getTop(20);

  $('rec-profile-status').innerHTML = hasProfile
    ? `<span class="status-pill active">● Profile loaded: ${ProfileAgent.getSummary().slice(0,60)}…</span>`
    : `<span class="status-pill idle">○ No profile — <a href="#" onclick="navigate('profile');return false;" style="color:var(--accent)">Set up profile</a> for personalized recommendations</span>`;

  $('rec-list').innerHTML = recs.map((s, i) => `
    <div class="rec-card" onclick="openScheme('${esc(s.slug)}')">
      <div style="display:flex;gap:16px;align-items:center">
        <div style="text-align:center;min-width:60px">
          <div class="rec-score">${s._score || '—'}</div>
          <div class="rec-label">match %</div>
        </div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;margin-bottom:6px">${esc(s.name)}</div>
          <div class="scheme-meta">
            <span class="tag ${s.level.toLowerCase()}">${s.level}</span>
            <span class="tag cat">${s.category.split(',')[0].trim()}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:6px">${esc((s.benefits||'').slice(0,120))}…</div>
        </div>
        <div style="font-size:20px;color:var(--text3)">#${i+1}</div>
      </div>
    </div>
  `).join('');
}

// ─── CONFLICTS ────────────────────────────────────────────────────────────────
function renderConflicts() {
  const bookmarkedSchemes = State.schemes.filter(s => isBookmarked(s.slug));
  const container = $('conflict-list');
  const status = $('conflict-status');

  if (bookmarkedSchemes.length < 2) {
    status.innerHTML = '<span class="status-pill idle">○ Bookmark 2+ schemes to detect conflicts</span>';
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div><h3>Need more bookmarks</h3><p>Bookmark at least 2 schemes to analyze conflicts between them.</p></div>';
    return;
  }

  const conflicts = ConflictAgent.detect(bookmarkedSchemes);
  status.innerHTML = `<span class="status-pill ${conflicts.length?'':'active'}">
    ${conflicts.length ? `⚠️ ${conflicts.length} conflict(s) detected in ${bookmarkedSchemes.length} bookmarked schemes` : `✅ No major conflicts in ${bookmarkedSchemes.length} bookmarked schemes`}
  </span>`;

  if (conflicts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><h3>No conflicts detected</h3><p>Your bookmarked schemes appear compatible.</p></div>';
    return;
  }

  container.innerHTML = conflicts.map(c => `
    <div class="conflict-item">
      <div class="conflict-header">⚠️ ${esc(c.type)}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${esc(c.desc)}</div>
      <div style="font-size:11px;color:var(--text3)">Affected: ${c.schemes.map(n => `<strong>${esc(n.slice(0,50))}…</strong>`).join(', ')}</div>
    </div>
  `).join('');
}

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────
function renderBookmarks() {
  const schemes = State.schemes.filter(s => isBookmarked(s.slug));
  const container = $('bookmarks-list');
  $('bookmarks-count-label').textContent = `${schemes.length} saved`;

  if (schemes.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔖</div><h3>No bookmarks yet</h3><p>Browse schemes and bookmark the ones you are interested in.</p></div>';
    return;
  }

  container.innerHTML = schemes.map(s => {
    const prog = ChecklistAgent.getProgress(s.slug, DocumentAgent.extractDocuments(s).length + DocumentAgent.extractSteps(s).length);
    return `
      <div class="rec-card" onclick="openScheme('${esc(s.slug)}')">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;margin-bottom:6px">${esc(s.name)}</div>
            <div class="scheme-meta">
              <span class="tag ${s.level.toLowerCase()}">${s.level}</span>
              <span class="tag cat">${s.category.split(',')[0].trim()}</span>
            </div>
            ${prog.total > 0 ? `
              <div style="margin-top:8px">
                <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Application progress: ${prog.pct}%</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
              </div>
            ` : ''}
          </div>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();toggleBookmark('${esc(s.slug)}');renderBookmarks()">Remove</button>
        </div>
      </div>
    `;
  }).join('');
}

// ─── PROFILE FORM ─────────────────────────────────────────────────────────────
function saveProfile() {
  const data = {
    name: $('p-name').value.trim(),
    age: $('p-age').value.trim(),
    gender: $('p-gender').value,
    state: $('p-state').value.trim(),
    occupation: $('p-occupation').value.trim(),
    income: $('p-income').value.trim(),
    category: $('p-category').value,
    education: $('p-education').value,
    interests: $('p-interests').value.trim(),
  };
  ProfileAgent.save(data);
  showToast('Profile saved! Recommendations updated.', 'success');
  renderHome();
}

function loadProfileForm() {
  const p = ProfileAgent.load();
  if (p.name) $('p-name').value = p.name || '';
  if (p.age) $('p-age').value = p.age || '';
  if (p.gender) $('p-gender').value = p.gender || '';
  if (p.state) $('p-state').value = p.state || '';
  if (p.occupation) $('p-occupation').value = p.occupation || '';
  if (p.income) $('p-income').value = p.income || '';
  if (p.category) $('p-category').value = p.category || '';
  if (p.education) $('p-education').value = p.education || '';
  if (p.interests) $('p-interests').value = p.interests || '';
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function addChatMessage(role, content, agentName, offline) {
  const container = $('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  const avatar = role === 'user' ? '👤' : '🧠';
  const html = `
    <div class="chat-avatar">${avatar}</div>
    <div>
      ${role === 'assistant' ? `<div class="chat-agent-tag">⚙️ ${agentName||'Orchestrator'}${offline?' · Offline Mode':''}</div>` : ''}
      <div class="chat-bubble">${renderMarkdown(content)}</div>
    </div>
  `;
  div.innerHTML = html;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addThinking() {
  const container = $('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg assistant';
  div.id = 'thinking-indicator';
  div.innerHTML = `
    <div class="chat-avatar">🧠</div>
    <div><div class="chat-bubble"><div class="thinking"><span></span><span></span><span></span></div></div></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function sendChat() {
  const input = $('chat-textarea');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  input.style.height = 'auto';
  $('send-btn').disabled = true;

  addChatMessage('user', msg);
  const thinking = addThinking();

  // 🔥 NEW OLLAMA PIPELINE
let responseText = "";
let offline = false;

try {
  // Step 1: Extract structured profile using Ollama
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      model: "phi3",
      prompt: `
Extract user info in JSON:
- age
- state
- occupation
- income
- category

ONLY return JSON.

Input: ${msg}
      `,
      stream: false
    })
  });

  const data = await res.json();

  let profile = {};
  try {
    profile = JSON.parse(data.response);
    ProfileAgent.save(profile);
  } catch {
    responseText = "Tell me your age, state, and income for better results.";
  }

  // Step 2: Use YOUR EXISTING SYSTEM
  if (!responseText) {
    const schemes = SchemeRetrievalAgent.search(msg);

    if (!schemes || schemes.length === 0) {
      responseText = "No schemes found. Try adding more details.";
    } else {
      responseText = "Here are some schemes for you:\n\n";

      schemes.slice(0, 5).forEach((s, i) => {
        responseText += `**${i+1}. ${s.name}**\n`;
        responseText += `${(s.benefits || "").slice(0,100)}...\n\n`;
      });
    }
  }

} catch (e) {
  // fallback (offline)
  offline = true;
  const schemes = SchemeRetrievalAgent.search(msg);

  if (!schemes || schemes.length === 0) {
    responseText = "Offline mode: No schemes found.";
  } else {
    responseText = "Offline results:\n\n";
    schemes.slice(0,5).forEach((s,i)=>{
      responseText += `${i+1}. ${s.name}\n`;
    });
  }
}
  thinking.remove();

 addChatMessage('assistant', responseText, 'PolicyPilot AI', offline);
  $('send-btn').disabled = false;
}

function quickPrompt(text) {
  $('chat-textarea').value = text;
  navigate('chat');
  setTimeout(() => sendChat(), 100);
}

// ─── CATEGORIES POPULATE ──────────────────────────────────────────────────────
function populateCategories() {
  const cats = SchemeRetrievalAgent.getCategories();
  const sel = $('filter-cat');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  // Load data
  await loadSchemeChunks();

  // Init agents
  loadBookmarks();
  ProfileAgent.load();
  loadProfileForm();
  populateCategories();

  // Hide loading screen
  const ls = $('loading-screen');
  ls.style.opacity = '0';
  setTimeout(() => ls.remove(), 500);

  // Update header badge
  $('header-scheme-count').textContent = State.schemes.length.toLocaleString() + ' Schemes';

  // Show home
  navigate('home');

  // Welcome message in chat
  const profile = State.profile;
  const greeting = profile.name ? `Hello ${profile.name}! ` : 'Hello! ';
  addChatMessage('assistant', `${greeting}I'm **YojanaAI**, your intelligent guide to Indian government schemes. I have **${State.schemes.length.toLocaleString()}** schemes loaded locally.\n\nYou can ask me:\n- "What schemes are available for farmers in Maharashtra?"\n- "I am a woman entrepreneur, what schemes help me?"\n- "How do I apply for PM Awas Yojana?"\n- "Find education schemes for SC students"\n\nI work offline too! 🌐`, 'Orchestrator');
}

// Event listeners
window.addEventListener('DOMContentLoaded', init);

// Textarea auto-resize + enter-to-send
document.addEventListener('DOMContentLoaded', () => {
  const ta = $('chat-textarea');
  if (ta) {
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    });
  }

  // Search on Enter
  const si = $('search-input');
  if (si) si.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });

  // Modal close on overlay click
  $('scheme-modal').addEventListener('click', e => { if(e.target === $('scheme-modal')) closeModal(); });
});

// Expose globals
window.navigate = navigate;
window.openScheme = openScheme;
window.closeModal = closeModal;
window.toggleCL = toggleCL;
window.doSearch = doSearch;
window.changePage = changePage;
window.saveProfile = saveProfile;
window.sendChat = sendChat;
window.quickPrompt = quickPrompt;
window.renderBookmarks = renderBookmarks;
