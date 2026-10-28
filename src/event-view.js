import { bingoView, downloadBingo, bindBingoTasks } from './bingo.js';
import { courses } from './data.js';
import { clubhouseBand } from './clubhouse-footer.js';
import { guildView, personalGuild } from './guilds.js';
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const labels = {
  badges: 'Curriculum badges', streak: 'Best badge streak', earlyFinish: 'Early completion',
  attendance: 'Session attendance', activities: 'Community activities', bingo: 'Full Bingo bonus', xp: 'Google Skills XP',
};

export function eventView(snapshot, status, hash) {
  const guildName = id => snapshot.guilds.find(guild => guild.id === id)?.name || 'Guild not assigned';
  const people = [...snapshot.participants].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  let remembered = null;
  try { remembered = localStorage.getItem('study-jam-event-person'); } catch { /* Optional storage. */ }
  const profile = people.find(person => `profile/${person.id}` === hash || (hash === 'home' && person.id === remembered));
  const updated = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(snapshot.updatedAt));
  const rows = list => list.map((person, index) => `
    <a class="person-row" href="#profile/${person.id}" ${index >= 30 ? 'hidden' : ''}>
      <span class="rank">${person.rank}</span>
      <span class="person-name">${escape(person.name)}<small>${escape(guildName(person.guildId))}</small></span>
      <span class="badges-column">${person.badgesCompleted}/10</span>
      <strong>${person.points.toFixed(1)}</strong>
    </a>`).join('');
  const intro = `<p class="event-data-status" role="status">Last updated ${escape(updated)} IST${status === 'stale' ? ' · Showing saved progress. Refresh is temporarily unavailable.' : ''}</p>`;
  if (hash.startsWith('profile/') && !profile) return `${intro}<section class="empty-state"><h1>Profile not found</h1><p>This profile link may have changed. Find your name in the standings.</p><a href="#leaderboard" class="button primary">Find my place</a></section>`;
  if (hash === 'badges') return `${intro}<section class="simple-intro"><h1>The badge list</h1><p>Ten curriculum badges. Each eligible completion counts once.</p></section><div class="catalog-grid">${courses.map(course => `<article class="course-tile"><span class="category">${escape(course.category)}</span><h2>${escape(course.title)}</h2><p>${Math.max(4, course.credits)} event points</p><a class="text-link" href="${course.url}" target="_blank" rel="noopener noreferrer">Open Google Skills ↗</a></article>`).join('')}</div>`;
  if (hash === 'fame') return `${intro}<section class="simple-intro"><h1>Hall of Fame</h1><p>Weekly recognition from the organizing team.</p></section><section class="empty-state"><h2>No awards announced yet.</h2><p>Weekly MVP and top-guild awards will appear once organizers announce them.</p><a class="button primary" href="#leaderboard">Explore the standings</a></section>`;
  if (profile) {
    const next = [...people].reverse().find(person => person.points > profile.points);
    const bingoPerson = { ...profile, synthetic: false, badges: profile.badgesCompleted, scoreBreakdown: { ...profile.scoreBreakdown, badgeDetails: profile.badgeDetails || [] } };
    return `${intro}<section class="simple-intro"><a href="#leaderboard" class="text-link">← Back to standings</a>
      <h1>${escape(profile.name)}</h1><p>#${profile.rank} · ${profile.points.toFixed(1)} points · ${escape(guildName(profile.guildId))}</p><button class="button secondary" data-remember-event="${profile.id}">Remember my profile</button>
      <p>${next ? `${(next.points - profile.points + 0.1).toFixed(1)} points to move ahead of ${escape(next.name)}.` : 'You share the highest score. Keep learning.'}</p></section>
      <section class="score-breakdown"><h2>Where the points came from</h2><dl class="score-ledger">
        ${Object.entries(labels).map(([key, label]) => `<div><dt>${label}</dt><dd>${profile.scoreBreakdown[key].toFixed(1)}</dd></div>`).join('')}
        <div class="score-ledger-total"><dt>Total event points</dt><dd>${profile.points.toFixed(1)}</dd></div></dl>
        <p>${profile.badgesCompleted} of 10 curriculum badges completed.</p><a href="#rules" class="text-link">How scoring works →</a>
        <p>Best badge streak: ${profile.bestStreak ?? 'Not supplied'} days.</p></section>
        ${profile.badgeDetails ? `<section class="score-breakdown"><h2>Your completed badges</h2><ul class="badge-values">${profile.badgeDetails.map(badge => `<li><span>${escape(courses.find(course => course.id === badge.id)?.title || badge.id)}<small>${escape(badge.date)}</small></span><strong>+${badge.points}</strong></li>`).join('')}</ul></section>` : ''}
        ${personalGuild(snapshot, profile)}
        ${profile.badgeDetails ? bingoView(bingoPerson, escape) : '<p>Detailed badge and Bingo evidence has not been published yet.</p>'}`;
  }
  if (hash === 'guilds' || hash.startsWith('guild/')) return `${intro}${guildView(snapshot, hash.startsWith('guild/') ? decodeURIComponent(hash.slice(6)) : null)}`;
  return `<section class="board-intro clubhouse-intro">
    <div class="intro-copy"><div class="club-event"><img src="/assets/google-cloud-logo.svg" alt="Google Cloud" width="123" height="20"><span>Study Jam 2026</span></div>
      <h1>Cloud Study Jam<br><span>ABV-IIITM</span><span class="headline-dot" aria-hidden="true"></span></h1>
      <p>A Cloud Study Jam for ABV-IIITM students.<br>Track your badges, points and guild standings.</p>
      <div class="hero-actions"><button class="button primary" data-event-find>Find my place ↗</button><a class="text-link" href="#rules">How to earn points →</a></div>
      <div class="club-community"><span>${people.length} learners</span><span>10 skill badges</span><span>Until 22 Nov</span></div>
    </div><div class="intro-feature"><div class="member-ticket">
      <div class="ticket-colorline" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="ticket-top"><span>Your campus learning club</span><span>2026</span></div>
      <div class="event-pass"><img src="/assets/gdg-gwalior-badge.webp" alt="GDG on Campus ABV-IIITM Gwalior" width="100" height="100"><h2>10 badges.<br>22 November.</h2><p>Finish the curriculum before the deadline.<br>Check the rules for points and bonuses.</p><a class="button secondary" href="#badges">Explore the badges ↗</a></div>
      <a href="#home">Find your progress →</a></div><div class="ticket-caption">GDG on Campus · ABV-IIITM Gwalior</div></div>
    </section>${clubhouseBand('event-hero')}${intro}
    <section class="standings" id="event-standings"><div class="section-heading"><h2>The leaderboard</h2><span>${people.length} learners</span></div>
      <div class="board-controls"><label class="search-field"><span class="sr-only">Search learners</span><input id="event-search" type="search" placeholder="Search your name…"></label>
      <label class="guild-select"><span class="sr-only">Filter guilds</span><select id="event-guild"><option value="">All learners</option>${snapshot.guilds.map(guild => `<option value="${escape(guild.id)}">${escape(guild.name)}</option>`).join('')}<option value="unassigned">Guild not assigned</option></select></label></div>
      <div class="table-header"><span>Place</span><span>Learner</span><span class="badges-column">Badges</span><span>Points</span></div>
      <div id="event-rows">${rows(people)}</div><div class="board-bottom"><p id="event-results" role="status">${Math.min(30, people.length)} of ${people.length} learners</p><button class="text-button" id="event-more" ${people.length <= 30 ? 'hidden' : ''}>Show more learners</button></div></section>`;
}

export function bindEventView(snapshot) {
  if (!snapshot) return;
  const rememberButton = document.querySelector('[data-remember-event]');
  rememberButton?.addEventListener('click', () => {
    try { localStorage.setItem('study-jam-event-person', rememberButton.dataset.rememberEvent); rememberButton.textContent = 'Profile remembered'; }
    catch { rememberButton.textContent = 'Use this profile’s link to return'; }
  });
  const person = snapshot.participants.find(person => location.hash === `#profile/${person.id}` || person.id === rememberButton?.dataset.rememberEvent);
  document.querySelector('[data-bingo-download]')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { await downloadBingo({ ...person, badges: person.badgesCompleted, synthetic: false, scoreBreakdown: { ...person.scoreBreakdown, badgeDetails: person.badgeDetails || [] } }); }
    catch { document.querySelector('#toast').textContent = 'Could not create your card. Please try again.'; }
    finally { document.querySelector('[data-bingo-download]').disabled = false; }
  });
  document.querySelector('[data-bingo-caption]')?.addEventListener('click', async event => {
    try { await navigator.clipboard.writeText('Cloud Bingo complete! Learning with GDG on Campus ABV-IIITM. #CloudStudyJams'); event.target.textContent = 'Caption copied'; }
    catch { event.target.textContent = 'Clipboard unavailable'; }
  });
  if (person) bindBingoTasks({ ...person, synthetic: false, badges: person.badgesCompleted, scoreBreakdown: { ...person.scoreBreakdown, badgeDetails: person.badgeDetails || [] } });
  const search = document.querySelector('#event-search');
  const guild = document.querySelector('#event-guild');
  if (!search || !guild) return;
  const rows = [...document.querySelectorAll('#event-rows .person-row')];
  const sorted = [...snapshot.participants].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  let limit = 30;
  const more = document.querySelector('#event-more');
  function filter() {
    let count = 0;
    rows.forEach((row, index) => {
      const person = sorted[index];
      const matches = person.name.toLowerCase().includes(search.value.trim().toLowerCase()) &&
        (!guild.value || (guild.value === 'unassigned' ? person.guildId === null : person.guildId === guild.value));
      if (matches) count++;
      row.hidden = !matches || count > limit;
    });
    document.querySelector('#event-results').textContent = count ? `${Math.min(limit, count)} of ${count} learners` : 'No learners found. Try another name or guild.';
    if (more) more.hidden = count <= limit;
  }
  search.addEventListener('input', () => { limit = 30; filter(); });
  guild.addEventListener('change', () => { limit = 30; filter(); });
  more?.addEventListener('click', () => { limit += 30; filter(); });
  document.querySelector('[data-event-find]')?.addEventListener('click', () => {
    search.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    search.focus({ preventScroll: true });
  });
}
