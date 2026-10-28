import { bingoView, downloadBingo } from './bingo.js';
import { loadSnapshot } from './load-snapshot.js';
import { eventView, bindEventView } from './event-view.js';
import { scoringPage, scoreBreakdown } from './scoring-view.js';
import { clubhouseBand, clubhouseFooter } from './clubhouse-footer.js';
import { participants, guilds, courses, guildSummary } from './data.js';
import { designs, canvasHero, buildersHero, courseLens } from './previews.js';

const app = document.querySelector('#app');
const query = new URLSearchParams(location.search);
const eventMode = query.get('data') === 'event' || (import.meta.env.PROD && query.get('data') !== 'demo');
let eventData = { status: 'loading', snapshot: null };
const teamPreview = import.meta.env.PROD;
const design = !teamPreview && Object.hasOwn(designs, query.get('design')) ? query.get('design') : 'clubhouse';
if (query.has('design') && query.get('design') !== design) {
  query.set('design', design);
  history.replaceState(null, '', `${location.pathname}?${query}${location.hash}`);
}
let filter = 'All guilds';
let search = '';
let limit = 15;
let remembered = 'demo-5';
let dark = false;
try { remembered = localStorage.getItem('study-jam-preview-person') || remembered; dark = localStorage.getItem('study-jam-preview-dark') === 'true'; } catch { /* Private browsing may disable storage. */ }
if (!participants.some(p => p.id === remembered)) remembered = 'demo-5';
document.documentElement.dataset.design = design;
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
const icon = (name, cls = '') => `<img class="icon ${cls}" src="/icons/${name}.svg" alt="" width="20" height="20">`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = name => name.split(' ').map(n => n[0]).slice(0, 2).join('');
const guildIcon = id => icon(guilds.find(g => g.id === id)?.symbol || 'cloud');
const courseIcon = course => course.asset ? `<img class="product-icon" src="/assets/${course.asset}" width="32" height="32" alt="Google Cloud ${course.id === 'compute' ? 'Compute Engine' : 'Cloud Storage'}">` : icon(course.icon);
const selected = () => participants.find(p => p.id === remembered);
const route = () => location.hash.replace('#', '') || 'leaderboard';
const personFromRoute = () => participants.find(p => p.id === route().split('/')[1]) || selected();
const profileLink = p => `#profile/${p.id}`;
function navLink(hash, text, active) { return `<a href="#${hash}" ${active ? 'aria-current="page"' : ''}>${text}</a>`; }

function shell(content) {
  const current = route();
  app.innerHTML = `
    <div class="preview-strip"><div class="strip-inner"><span>${icon('code')} ${teamPreview ? 'Team feedback preview' : 'Interactive design preview'} <span class="desktop-only">/ Sample data</span></span>${teamPreview ? '' : `<div class="design-picker" aria-label="Choose a design">${Object.entries(designs).map(([key, value]) => `<a href="?design=${key}${location.hash}" ${design === key ? 'aria-current="true"' : ''}>${value.name}</a>`).join('')}</div>`}</div></div>
    <header class="site-header"><div class="header-inner"><a class="brand" href="#leaderboard" aria-label="Study Jam leaderboard"><img class="chapter-logo" src="/assets/gdg-gwalior-badge.webp" alt="Google Developer Group ABV-IIITM Gwalior chapter badge" width="54" height="54"><span class="brand-copy"><strong>GDG on Campus</strong><small>ABV-IIITM Gwalior</small></span></a><nav class="desktop-nav" aria-label="Main navigation">${navLink('leaderboard', 'Leaderboard', current === 'leaderboard')}${navLink('guilds', 'Guilds', current === 'guilds')}${navLink('badges', 'Badges', current === 'badges')}${navLink('rules', 'Scoring', current === 'rules')}</nav><div class="header-actions"><button class="icon-button" id="theme" aria-label="Switch to ${dark ? 'light' : 'dark'} theme">${icon(dark ? 'sun' : 'moon')}</button><a href="#home" class="my-link"><span class="tiny-avatar">${initials(selected().name)}</span><span>My progress</span></a></div></div><nav class="mobile-nav" aria-label="Mobile navigation">${navLink('leaderboard', 'Leaderboard', current === 'leaderboard')}${navLink('guilds', 'Guilds', current === 'guilds')}${navLink('badges', 'Badges', current === 'badges')}${navLink('home', 'My progress', current === 'home' || current.startsWith('profile'))}</nav></header>
    <main id="main" tabindex="-1">${content}</main>
    ${design === 'clubhouse' ? clubhouseFooter() : `<footer class="site-footer"><div class="chapter-footer"><img src="/assets/gdg-gwalior-badge.webp" alt="GDG ABV-IIITM Gwalior" width="52" height="52"><span>Cloud Study Jam 2026<strong>GDG on Campus · ABV-IIITM Gwalior</strong></span></div><a class="footer-title" href="#leaderboard">A little further, together.</a><div><span>ABV-IIITM Gwalior</span><span>14 Sep - 22 Nov 2026</span></div><p>Independent student event website. All participants and scores in this preview are fictional.</p><a href="#references">Design references & asset credits ${icon('arrow-up-right')}</a></footer>`}
    <dialog id="find-dialog" aria-labelledby="find-title"><div class="dialog-header"><h2 id="find-title">Find your place.</h2><button class="icon-button" id="close-dialog" aria-label="Close profile search">${icon('x')}</button></div><p>Choose a sample profile to explore your progress. This is not sign-in.</p><form id="find-form"><label for="find-query">Name or demo roll number</label><input id="find-query" name="profile" placeholder="Try Aarav or DEMO005" autocomplete="off"><p class="input-help">Only fictional demo roll numbers are supported here.</p><div id="find-results" class="find-results" aria-live="polite"></div></form></dialog>
    <div id="toast" class="toast" role="status"></div>`;
  if (eventMode) {
    document.querySelector('.preview-strip .strip-inner>span').textContent = 'Cloud Study Jam 2026 · ABV-IIITM';
    document.querySelector('.my-link')?.remove();
    const note = document.querySelector('.footer-demo-note');
    if (note) note.textContent = 'Learn together. Keep moving forward.';
    const footerNav = document.querySelector('.footer-nav') || document.querySelector('[aria-label="Footer navigation"]');
    if (footerNav) footerNav.insertAdjacentHTML('beforeend', '<div><h3>Recognition</h3><a href="#fame">Hall of Fame</a></div>');
  }
  bindShell();
}

function hero() {
  const person = selected();
  const helpers = { icon, escape, courseIcon, initials };
  if (design === 'canvas') return canvasHero(person, courses, helpers);
  if (design === 'builders') return buildersHero(person, participants, helpers);
  return clubhouseHero(person);
}

function clubhouseHero(p) {
  return `<section class="board-intro clubhouse-intro">
    <div class="intro-copy">
      <div class="club-event"><img src="/assets/google-cloud-logo.svg" alt="Google Cloud" width="123" height="20"><span>Study Jam 2026</span><span class="sample-label">Sample data</span></div>
      <h1>Your guild.<br><span>Your next level</span><span class="headline-dot" aria-hidden="true"></span></h1>
      <p>A Cloud Study Jam for ABV-IIITM students.<br>Ten badges to learn, collect and complete.</p>
      <div class="hero-actions"><button class="button primary" data-find>Find my place ${icon('arrow-up-right')}</button><button class="text-button jump-to-board" data-standings>See standings ${icon('arrow-right')}</button></div>
      <div class="club-community"><span>${icon('users-three')} 500 learners</span><span>${icon('flag')} 8 guilds</span><span>${icon('check-circle')} 10 skill badges</span></div>
    </div>
    <div class="intro-feature">
      <div class="member-ticket">
        <div class="ticket-colorline" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="ticket-top"><span>Cloud Study Jam</span><span>2026</span></div>
        <div class="ticket-person"><div class="ticket-identity"><span class="ticket-avatar">${initials(p.name)}</span><div><strong>${escape(p.name)}</strong><span>${guildIcon(p.guildId)} Guild ${p.guildId}</span></div></div><img class="ticket-chapter-seal" src="/assets/gdg-gwalior-badge.webp" alt="Hosted by GDG ABV-IIITM Gwalior" width="62" height="62"></div>
        <div class="ticket-stats"><div><span>YOUR PLACE</span><strong>${String(p.rank).padStart(2, '0')}<small>/500</small></strong></div><div><span>EVENT POINTS</span><strong>${p.points}</strong></div></div>
        <div class="ticket-collection"><div><span>Your badge collection</span><strong>${p.badges}<small> /10</small></strong></div><div class="ticket-badge-track" aria-label="${p.badges} of ten badges completed">${courses.map((c, i) => `<span class="${i < p.badges ? 'collected' : ''}" style="--badge-index:${i}" title="${escape(c.title)}: ${i < p.badges ? 'completed' : 'remaining'}">${i < p.badges ? icon('check') : ''}</span>`).join('')}</div></div>
        <a href="#home">Your guild. Your progress. ${icon('arrow-up-right')}</a>
      </div>
      <div class="ticket-caption">Your place in this Study Jam.</div>
    </div>
  </section>`;
}

function leaderboard() {
  shell(`${hero()}${design === 'clubhouse' ? clubhouseBand('hero') : ''}<div class="board-layout"><section class="standings" aria-labelledby="standings-title"><div class="section-heading"><div><h2 id="standings-title">The leaderboard</h2><p>Progress worth cheering for.</p></div><span class="quiet-meta">${icon('users-three')} 500 learners</span></div>${design === 'clubhouse' ? '<p class="scoring-preview-note">Sample data, calculated with the adopted rules. <a href="#rules">How scoring works →</a></p>' : ''}<div class="board-controls"><label class="search-field">${icon('magnifying-glass')}<span class="sr-only">Search participants</span><input id="board-search" type="search" placeholder="Search a name…" value="${escape(search)}"></label><label class="guild-select"><span class="sr-only">Filter by guild</span><select id="guild-filter">${['All guilds', ...guilds.map(g => g.id)].map(g => `<option ${filter === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label></div><div class="table-header"><span>Place</span><span>Learner</span><span class="badges-column">Badges</span><span>Points</span></div><div id="rows" aria-live="polite"></div><div class="board-bottom"><span id="result-count"></span><button id="load-more" class="text-button">Show more ${icon('arrow-right')}</button></div></section><aside class="board-aside"><section class="your-place"><div class="section-heading"><h3>Your next step</h3>${icon('flag')}</div><span class="small-label">${escape(selected().name)}</span><div class="place-number">#${selected().rank}<span>${selected().points} points</span></div><p>${selected().rank === 1 ? 'You’re leading the way. Keep exploring.' : `${selected().nextRankGap} points to the next place.`}</p><a class="button secondary" href="#home">Your progress ${icon('arrow-up-right')}</a></section><section class="guild-note"><span class="guild-emblem ${guilds.find(g => g.id === selected().guildId).color}">${guildIcon(selected().guildId)}</span><h3>You’re with ${selected().guildId}.</h3><p>Explore your guild’s learners and badge progress.</p><a href="#guild/${selected().guildId}" class="text-link">Meet your guild ${icon('arrow-right')}</a></section><div class="data-note">${icon('check-circle')} Demo snapshot, 27 Oct 2026<br>Scoring is illustrative.</div></aside></div>`);
  document.querySelector('#board-search').addEventListener('input', e => { search = e.target.value; limit = 15; renderRows(); });
  document.querySelector('#guild-filter').addEventListener('change', e => { filter = e.target.value; limit = 15; renderRows(); });
  document.querySelector('#load-more').addEventListener('click', () => { limit += 30; renderRows(); });
  renderRows();
  document.querySelectorAll('[data-course-preview]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.coursePreview);
    document.querySelectorAll('[data-course-preview]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelector('#course-lens').innerHTML = courseLens(courses[index], index, selected(), { icon, escape, courseIcon });
  }));
}
function personRow(p, localRank = null) {
  return `<a class="person-row ${p.id === remembered ? 'is-you' : ''}" href="${profileLink(p)}"><span class="rank ${p.rank <= 3 ? 'top-rank rank-' + p.rank : ''}">${localRank || p.rank}</span><span class="person-cell"><span class="avatar tone-${p.rank % 4}">${initials(p.name)}</span><span class="person-name">${escape(p.name)}${p.id === remembered ? '<small class="you-tag">You</small>' : ''}<small>${escape(p.guildId)}${design === 'clubhouse' ? `<span class="mobile-row-badges"> · ${p.badges}/10 badges</span>` : ''}</small></span></span><span class="badge-count badges-column">${icon('check-circle')} ${p.badges}<small>/ 10</small></span><strong class="person-points">${p.points.toLocaleString('en-IN')}${icon('arrow-up-right')}</strong></a>`;
}
function renderRows() {
  const matches = participants.filter(p => (filter === 'All guilds' || p.guildId === filter) && p.name.toLowerCase().includes(search.trim().toLowerCase()));
  document.querySelector('#rows').innerHTML = matches.length ? matches.slice(0, limit).map(p => personRow(p)).join('') : `<div class="empty-state">${icon('magnifying-glass')}<h3>No learners found</h3><p>Try a shorter name or choose another guild.</p><button id="reset-search" class="button secondary">Reset search</button></div>`;
  document.querySelector('#result-count').textContent = `${Math.min(limit, matches.length)} of ${matches.length} learners`;
  document.querySelector('#load-more').hidden = matches.length <= limit;
  document.querySelector('#reset-search')?.addEventListener('click', () => { search = ''; filter = 'All guilds'; leaderboard(); document.querySelector('#board-search').focus(); });
}

function home() {
  const p = route().startsWith('profile/') ? personFromRoute() : selected();
  const own = p.id === remembered;
  const group = guildSummary(p.guildId);
  const guildPosition = group.members.findIndex(m => m.id === p.id) + 1;
  const next = participants.findLast(x => x.points > p.points);
  const collected = courses.slice(0, p.badges);
  shell(`<div class="page-heading"><a href="#leaderboard" class="text-link">${icon('arrow-left')} Back to leaderboard</a><span class="sample-label">Sample profile</span></div><section class="profile-intro"><div><div class="event-context">${own ? 'Your cloud journey' : 'Learner profile'}</div><h1>${own ? `Keep going,<br><span>${escape(p.name.split(' ')[0])}.</span>` : escape(p.name)}</h1><p>${p.badges ? 'Look how far a little curiosity can take you.' : 'Every journey starts with one badge. Your first is waiting.'}</p><a class="text-link" href="#guild/${p.guildId}">${guildIcon(p.guildId)} Guild ${p.guildId} ${icon('arrow-up-right')}</a></div><div class="profile-score"><span>Overall place</span><strong>#${p.rank}</strong><span>${p.points} event points <small>of 500 learners</small></span></div></section><div class="profile-layout"><div><section class="next-step"><div class="soft-icon">${icon(p.rank === 1 ? 'trophy' : 'flag')}</div><div><h2>${p.rank === 1 ? 'You’re setting the pace.' : `${p.nextRankGap} points to your next place.`}</h2><p>${next ? `${escape(next.name)} is just ahead at ${next.points} points.` : 'Keep discovering something new.'}</p></div><a href="#badges" class="button primary">Find a badge ${icon('arrow-up-right')}</a></section>${bingoView(p, escape)}${scoreBreakdown(p, courses, escape)}<section class="collection"><div class="section-heading"><div><h2>Your badge collection</h2><p>Skills you’ve earned. Possibilities ahead.</p></div><strong class="collection-count">${p.badges}<span> / 10</span></strong></div><div class="collection-grid">${courses.map((c, i) => `<a href="${c.url}" target="_blank" rel="noopener noreferrer" class="collection-item ${i < p.badges ? 'earned' : 'unearned'}" aria-label="${escape(c.title)}: ${i < p.badges ? 'completed' : 'not completed'}, opens Google Skills"><span class="collection-symbol">${courseIcon(c)}<span class="completion-mark">${icon(i < p.badges ? 'check' : 'lock-simple')}</span></span><strong>${['Cloud Compute', 'IAM & roles', 'Speech & AI', 'AI Studio', 'Cloud Vision', 'Build a website', 'Gemini', 'Cloud data', 'Speech API', 'Generative AI'][i]}</strong></a>`).join('')}</div><a href="#badges" class="text-link">Explore all badges ${icon('arrow-right')}</a></section><section class="guild-progress"><div class="section-heading"><div><h2>A little stronger, together.</h2><p>${p.guildId} has ${group.members.length} learners on the journey.</p></div><a href="#guild/${p.guildId}" class="text-link">View guild ${icon('arrow-up-right')}</a></div><div class="mini-table">${group.members.slice(0, 3).map((m, i) => personRow(m, i + 1)).join('')}</div></section></div><aside class="profile-aside"><section class="streak-block"><span class="streak-symbol">${icon('fire')}</span><h3>Keep the spark.</h3><div class="streak-numbers"><div><strong>${p.currentStreak}<small>${p.currentStreak === 1 ? 'day' : 'days'}</small></strong><span>Current streak</span></div><div><strong>${p.bestStreak}<small>${p.bestStreak === 1 ? 'day' : 'days'}</small></strong><span>Personal best</span></div></div><div class="week-dots" aria-label="Illustrative activity over seven days">${['M','T','W','T','F','S','S'].map((d, i) => `<span class="${i < Math.min(p.currentStreak, 7) ? 'active' : ''}">${i < Math.min(p.currentStreak, 7) ? icon('check') : d}</span>`).join('')}</div><p>Badge activity, shown as sample data.</p></section><section class="milestone-block">${icon('medal')}<span>Personal milestone</span><h3>${p.milestone}</h3><p>${p.badges >= 10 ? 'All ten curriculum badges collected. Keep exploring.' : p.badges >= 5 ? 'Five badges behind you. A whole lot ahead.' : 'Your first five badges are a milestone worth making.'}</p><small>Curriculum milestones are separate from competition prizes.</small></section><section class="profile-details"><h3>Your place in ${p.guildId}</h3><strong>${guildPosition}<small> / ${group.members.length} learners</small></strong>${own ? '<button id="change-person" class="text-button">Choose another profile</button>' : `<button class="text-button" data-select="${p.id}">Remember this demo profile</button>`}</section></aside></div>`);
  document.querySelector('[data-bingo-download]')?.addEventListener('click', async e => { const button=e.currentTarget;button.disabled=true;try{await downloadBingo(p);}catch(error){document.querySelector('#toast').textContent=error.message;}finally{button.disabled=false;} });
  document.querySelector('[data-bingo-caption]')?.addEventListener('click', async e=>{try{await navigator.clipboard.writeText('Nine steps, completed! My Cloud Bingo with @gdg_oncampus_iiitm at ABV-IIITM Gwalior. #CloudStudyJams');e.currentTarget.textContent='Caption copied';}catch{e.currentTarget.textContent='Clipboard unavailable';}});
  document.querySelector('#change-person')?.addEventListener('click', openFind);
  document.querySelector('[data-select]')?.addEventListener('click', e => remember(e.currentTarget.dataset.select));
}

function guildPage() {
  const id = route().split('/')[1];
  const summaries = guilds.map(g => guildSummary(g.id)).sort((a, b) => b.average - a.average || a.id.localeCompare(b.id));
  const one = summaries.find(g => g.id === id);
  shell(`<section class="simple-intro"><div class="event-context">The people behind the progress <span class="sample-label">Sample data</span></div><h1>${one ? escape(one.id) + ', together.' : 'Find your people.'}</h1><p>${one ? one.motto : 'Eight guilds. Different strengths. A shared finish line.'}</p>${one ? '<a href="#guilds" class="text-link">All guilds '+icon('arrow-right')+'</a>' : '<p class="input-help">Guilds are ordered by average member score. <a href="#rules">Read the scoring rules →</a></p>'}</section>${one ? `<section class="standings"><div class="section-heading"><h2>${one.members.length} ${one.members.length === 1 ? 'learner' : 'learners'} in ${one.id}</h2><span class="quiet-meta">Guild positions</span></div><div class="table-header"><span>Place</span><span>Learner</span><span class="badges-column">Badges</span><span>Points</span></div>${one.members.map((p, i) => personRow(p, i + 1)).join('')}</section>` : `<div class="guild-grid">${summaries.map(g => `<a class="guild-tile" href="#guild/${g.id}"><span class="guild-emblem ${g.color}">${guildIcon(g.id)}</span><span class="guild-members">${g.members.length} ${g.members.length === 1 ? 'learner' : 'learners'}</span><h2>${g.id}</h2><p>${g.motto}</p><div class="guild-tile-bottom"><span><strong>${g.average}</strong> average points</span>${icon('arrow-up-right')}</div></a>`).join('')}</div>`}`);
}
function badgesPage() {
  const p = selected();
  shell(`<section class="simple-intro"><div class="event-context">The Study Jam curriculum <span class="sample-label">Sample progress</span></div><h1>Good skills.<br><span>Yours to collect.</span></h1><p>Ten hands-on badges. A little more confidence with every one.</p><div class="catalog-tools"><span>${p.badges} of 10 completed by ${escape(p.name.split(' ')[0])}</span><label><input type="checkbox" id="unfinished"> Show unfinished only</label></div></section><div class="catalog-grid" id="catalog">${courses.map((c, i) => `<article class="course-tile" data-complete="${i < p.badges}"><div class="course-top"><span class="course-symbol">${courseIcon(c)}</span><span class="course-status ${i < p.badges ? 'complete' : ''}">${icon(i < p.badges ? 'check-circle' : 'flag')}${i < p.badges ? 'Collected' : 'Up next'}</span></div><span class="category">${c.category}</span><h2>${escape(c.title)}</h2><a class="text-link" href="${c.url}" target="_blank" rel="noopener noreferrer">${i < p.badges ? 'Revisit course' : 'Explore course'} ${icon('arrow-up-right')}</a></article>`).join('')}</div>`);
  document.querySelector('#unfinished').addEventListener('change', e => document.querySelectorAll('.course-tile').forEach(el => el.hidden = e.target.checked && el.dataset.complete === 'true'));
}
function references() {
  shell(`<section class="simple-intro"><h1>Built with intention.</h1><p>Three coded design studies, before the final product.</p></section><section class="reference-content"><h2>What informed these previews</h2><p><a href="https://www.skills.google/" target="_blank" rel="noopener noreferrer">Google Skills</a>: recognizable brand assets, generous spacing and focused color.</p><p><a href="https://blog.duolingo.com/core-tabs-redesign/" target="_blank" rel="noopener noreferrer">Duolingo’s core-tabs design research</a>: purposeful artwork, consistent hierarchy and comparing soft, modular and flat concepts through prototypes. This is a website, so native bottom tabs are intentionally not used.</p><h2>GDG community references</h2><div class="reference-links"><a href="https://devfest.bhopal.dev/" target="_blank" rel="noopener noreferrer"><strong>DevFest Bhopal</strong><span>Local identity, confident typography, yellow actions and selective Google colors.</span>${icon('arrow-up-right')}</a><a href="https://www.gdgvitc.tech/" target="_blank" rel="noopener noreferrer"><strong>GDG VIT Chennai</strong><span>A welcoming student-community voice and purposeful color emphasis.</span>${icon('arrow-up-right')}</a><a href="https://www.gdgmpstme.com/" target="_blank" rel="noopener noreferrer"><strong>GDG MPSTME Mumbai</strong><span>Prominent chapter identity and people-first language.</span>${icon('arrow-up-right')}</a><a href="https://gdgnoida.com/" target="_blank" rel="noopener noreferrer"><strong>GDG Noida</strong><span>Clear community navigation and expressive type. Its dark grid is not carried into this design.</span>${icon('arrow-up-right')}</a></div><h2>Official assets</h2><p>The chapter badge was supplied by the organizer and is used intact. The Google Cloud wordmark and Compute Engine, Cloud Storage and BigQuery icons come from the <a href="https://cloud.google.com/icons" target="_blank" rel="noopener noreferrer">official Google Cloud library</a>. Product icons represent products, not issued skill badges. Other interface icons are Phosphor; type is self-hosted Manrope.</p><h2>What is real here?</h2><p>Search, guild filtering, profile selection, navigation, theme switching and course links work. All participant data is synthetic. Scores, streaks and badge completions are illustrative. No live Sheet, private roll lookup, prizes, sign-in or attendance integration is connected.</p></section>`);
}

function bindShell() {
  document.querySelector('#theme').addEventListener('click', () => {
    dark = !dark; document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('study-jam-preview-dark', String(dark)); } catch { /* Optional persistence. */ }
    const button = document.querySelector('#theme'); button.innerHTML = icon(dark ? 'sun' : 'moon'); button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  });
  document.querySelector('[data-standings]')?.addEventListener('click', () => document.querySelector('#standings-title')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
  document.querySelectorAll('[data-find]').forEach(el => el.addEventListener('click', openFind));
  const dialog = document.querySelector('#find-dialog');
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  document.querySelector('#find-query').addEventListener('input', e => updateFind(e.target.value));
  document.querySelector('#find-form').addEventListener('submit', e => { e.preventDefault(); document.querySelector('#find-results button')?.click(); });
}
function updateFind(value) {
  const q = value.trim().toLowerCase();
  const result = participants.filter(p => p.name.toLowerCase().includes(q) || `demo${p.id.split('-')[1].padStart(3, '0')}` === q).slice(0, 5);
  document.querySelector('#find-results').innerHTML = result.length ? result.map(p => `<button type="button" data-person="${p.id}"><span class="avatar tone-${p.rank % 4}">${initials(p.name)}</span><span>${escape(p.name)}<small>${p.guildId} · #${p.rank}</small></span>${icon('arrow-right')}</button>`).join('') : '<p>No demo profile found. Try Aarav or DEMO005.</p>';
  document.querySelectorAll('[data-person]').forEach(el => el.addEventListener('click', () => remember(el.dataset.person)));
}
function remember(id) {
  remembered = id;
  try { localStorage.setItem('study-jam-preview-person', id); } catch { /* Selection works without storage. */ }
  document.querySelector('#find-dialog')?.close();
  if (location.hash === '#home') render(); else location.hash = 'home';
}
function openFind() { updateFind('Aarav'); document.querySelector('#find-dialog').showModal(); document.querySelector('#find-query').focus(); }
function render() {
  const r = route();
  if (eventMode && r !== 'rules' && r !== 'references') {
    shell(eventData.snapshot ? eventView(eventData.snapshot, eventData.status, r) : `
      <section class="simple-intro" role="status"><h1>${eventData.status === 'loading' ? 'Gathering the latest progress…' : 'Scores are on their way.'}</h1>
      <p>${eventData.status === 'loading' ? 'Loading the latest standings.' : 'We couldn’t load the standings. Please try again shortly.'}</p>
      ${eventData.status === 'loading' ? '' : '<button class="button primary" id="retry-event">Try again</button>'}</section>`);
    document.querySelector('.preview-strip .strip-inner>span').textContent = 'Cloud Study Jam 2026 · ABV-IIITM';
    document.querySelector('.my-link')?.remove();
    const eventFooterNote = document.querySelector('.footer-demo-note');
    if (eventFooterNote) eventFooterNote.textContent = 'Learn together. Keep moving forward.';
    bindEventView(eventData.snapshot);
    document.querySelector('#retry-event')?.addEventListener('click', refreshEvent);
    document.title = 'Study Jam · Campus progress';
    return;
  }
  if (r === 'home' || r.startsWith('profile/')) home();
  else if (r === 'guilds' || r.startsWith('guild/')) guildPage();
  else if (r === 'badges') badgesPage();
  else if (r === 'rules') shell(eventMode ? scoringPage(courses, escape).replace('Rules adopted 28 Oct 2026 · Preview data', 'Event scoring rules · 2026') : scoringPage(courses, escape));
  else if (r === 'references') references();
  else leaderboard();
  document.title = `${r === 'rules' ? 'Scoring rules' : r === 'home' ? 'My progress' : r === 'badges' ? 'Badges' : r.startsWith('guild') ? 'Guilds' : 'Leaderboard'} · ${designs[design].name} · Study Jam`;
}
window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('#main').focus({ preventScroll: true }); });
render();
async function refreshEvent() {
  eventData = { status: 'loading', snapshot: null };
  render();
  eventData = await loadSnapshot();
  render();
}
if (eventMode) refreshEvent();
