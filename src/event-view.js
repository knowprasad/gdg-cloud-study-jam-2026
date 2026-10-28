import { bingoView, downloadBingo } from './bingo.js';
import { courses } from './data.js';
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
  const rows = list => list.map(person => `
    <a class="person-row" href="#profile/${person.id}">
      <span class="rank">${person.rank}</span>
      <span class="person-name">${escape(person.name)}<small>${escape(guildName(person.guildId))}</small></span>
      <span class="badges-column">${person.badgesCompleted}/10</span>
      <strong>${person.points.toFixed(1)}</strong>
    </a>`).join('');
  const intro = `<p class="event-data-status" role="status">${status === 'stale' ? 'Saved update · Refresh temporarily unavailable' : 'Organizer snapshot'} · ${escape(updated)} IST</p>`;
  if (hash === 'badges') return `${intro}<section class="simple-intro"><h1>Your next cloud skill.</h1><p>Ten curriculum badges. Each eligible completion counts once.</p></section><div class="catalog-grid">${courses.map(course => `<article class="course-tile"><span class="category">${escape(course.category)}</span><h2>${escape(course.title)}</h2><p>${Math.max(4, course.credits)} event points</p><a class="text-link" href="${course.url}" target="_blank" rel="noopener noreferrer">Open Google Skills ↗</a></article>`).join('')}</div>`;
  if (hash === 'fame') return `${intro}<section class="simple-intro"><h1>Hall of Fame</h1><p>Weekly recognition from the organizing team.</p></section><section class="empty-state"><h2>The first chapter is coming.</h2><p>Weekly MVP and top-guild awards will appear once organizers announce them.</p><a class="button primary" href="#leaderboard">Explore the standings</a></section>`;
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
        ${profile.badgeDetails ? bingoView(bingoPerson, escape) : '<p>Detailed badge and Bingo evidence has not been published yet.</p>'}`;
  }
  if (hash === 'guilds') {
    const guilds = snapshot.guilds.map(guild => {
      const members = people.filter(person => person.guildId === guild.id);
      return { ...guild, members, average: members.length ? members.reduce((sum, person) => sum + person.points, 0) / members.length : 0 };
    }).sort((a, b) => b.average - a.average);
    return `${intro}<section class="simple-intro"><h1>Stronger, together.</h1><p>Guild scores average every assigned member, including zero-point learners.</p></section>
      ${guilds.length ? guilds.map(guild => `<section class="standings"><h2>${escape(guild.name)}</h2><p>${guild.members.length} members · ${guild.average.toFixed(1)} average points</p>${rows(guild.members)}</section>`).join('') : '<section class="empty-state"><h2>Guilds are taking shape.</h2><p>Assignments will appear when the organizers publish them.</p></section>'}`;
  }
  return `${intro}<section class="simple-intro"><h1>Your campus.<br>Your next level.</h1><p>${people.length} learners. Every step counts.</p></section>
    <section class="standings"><div class="section-heading"><h2>The leaderboard</h2><button class="button secondary" data-event-find>Find me</button></div>
      <div class="board-controls"><label class="search-field"><span class="sr-only">Search learners</span><input id="event-search" type="search" placeholder="Search your name…"></label>
      <label class="guild-select"><span class="sr-only">Filter guilds</span><select id="event-guild"><option value="">All learners</option>${snapshot.guilds.map(guild => `<option value="${escape(guild.id)}">${escape(guild.name)}</option>`).join('')}<option value="unassigned">Guild not assigned</option></select></label></div>
      <div class="table-header"><span>Place</span><span>Learner</span><span class="badges-column">Badges</span><span>Points</span></div>
      <div id="event-rows">${rows(people)}</div><p id="event-results" role="status">${people.length} learners</p></section>`;
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
  const search = document.querySelector('#event-search');
  const guild = document.querySelector('#event-guild');
  if (!search || !guild) return;
  const rows = [...document.querySelectorAll('#event-rows .person-row')];
  const sorted = [...snapshot.participants].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  function filter() {
    let count = 0;
    rows.forEach((row, index) => {
      const person = sorted[index];
      row.hidden = !person.name.toLowerCase().includes(search.value.trim().toLowerCase()) ||
        Boolean(guild.value && (guild.value === 'unassigned' ? person.guildId !== null : person.guildId !== guild.value));
      if (!row.hidden) count++;
    });
    document.querySelector('#event-results').textContent = count ? `${count} learners` : 'No learners found. Try another name or guild.';
  }
  search.addEventListener('input', filter);
  guild.addEventListener('change', filter);
  document.querySelector('[data-event-find]')?.addEventListener('click', () => search.focus());
}
