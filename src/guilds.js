const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function guildStandings(snapshot) {
  const groups = snapshot.guilds.map(guild => {
    const members = snapshot.participants.filter(person => person.guildId === guild.id)
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    const total = members.reduce((sum, person) => sum + person.points, 0);
    return { ...guild, members, average: members.length ? Math.round(total / members.length * 10) / 10 : 0,
      active: members.filter(person => person.badgesCompleted > 0).length,
      completed: members.filter(person => person.badgesCompleted === 10).length,
      badges: members.reduce((sum, person) => sum + person.badgesCompleted, 0) };
  }).sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
  let previous, rank;
  return groups.map((guild, index) => {
    if (guild.average !== previous) rank = index + 1;
    previous = guild.average;
    return { ...guild, rank };
  });
}

export function guildCrest(guild) {
  const tone = [...guild.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  return `<span class="guild-crest gdg-tone-${tone}" aria-hidden="true"><img src="/icons/flag.svg" alt="" width="28" height="28"><span>${escape(guild.name.trim().slice(0, 1).toUpperCase())}</span></span>`;
}

function memberRows(members) {
  let previous, rank;
  return members.map((person, index) => {
    if (person.points !== previous) rank = index + 1;
    previous = person.points;
    return `<a class="person-row" href="#profile/${person.id}"><span class="rank">${rank}</span><span class="person-name">${escape(person.name)}<small>Overall #${person.rank}</small></span><span class="badges-column">${person.badgesCompleted}/10</span><strong>${person.points.toFixed(1)}</strong></a>`;
  }).join('');
}

export function guildView(snapshot, id) {
  const guilds = guildStandings(snapshot);
  const guild = guilds.find(item => item.id === id);
  if (id && !guild) return '<section class="empty-state"><h1>Guild not found</h1><p>This guild may have been renamed. Choose one from the directory.</p><a href="#guilds" class="button primary">View guilds</a></section>';
  if (guild) {
    const head = snapshot.participants.find(person => person.id === guild.headId);
    return `<section class="simple-intro guild-detail-intro"><a class="text-link" href="#guilds">← All guilds</a>${guildCrest(guild)}<h1>${escape(guild.name)}</h1><p>Guild #${guild.rank} · ${guild.members.length} ${guild.members.length === 1 ? 'member' : 'members'}</p><p>Guild head: ${head ? `<a href="#profile/${head.id}">${escape(head.name)}</a>` : 'To be announced'}</p></section>
      <div class="guild-summary"><div><strong>${guild.average.toFixed(1)}</strong><span>Average points</span></div><div><strong>${guild.active}/${guild.members.length}</strong><span>Started the curriculum</span></div><div><strong>${guild.completed}</strong><span>Completed all ten</span></div></div>
      <section class="standings"><div class="section-heading"><div><h2>Member standings</h2><p>Guild positions share rank when points are equal.</p></div></div><div class="table-header"><span>Place</span><span>Learner</span><span class="badges-column">Badges</span><span>Points</span></div>${memberRows(guild.members) || '<p>No members assigned yet.</p>'}</section>`;
  }
  return `<section class="simple-intro"><h1>Guild standings</h1><p>Your guild’s score is the average of every member’s points. Every learner counts.</p></section>${guilds.length ? `<div class="guild-grid">${guilds.map(guild => `<a class="guild-tile" href="#guild/${encodeURIComponent(guild.id)}">${guildCrest(guild)}<span class="guild-members">#${guild.rank} · ${guild.members.length} members</span><h2>${escape(guild.name)}</h2><p>${guild.active} started · ${guild.completed} completed all ten</p><progress max="${Math.max(1, guild.members.length * 10)}" value="${guild.badges}" aria-label="Curriculum badges earned by ${escape(guild.name)}"></progress><div class="guild-tile-bottom"><span><strong>${guild.average.toFixed(1)}</strong> average points</span><span>Meet the guild ↗</span></div></a>`).join('')}</div>` : '<section class="empty-state"><h2>No guilds assigned yet.</h2><p>Your guild and its members will appear here once assignments are ready.</p><a href="#leaderboard" class="button secondary">Find your place</a></section>'}`;
}

export function personalGuild(snapshot, person) {
  const guild = guildStandings(snapshot).find(item => item.id === person.guildId);
  if (!guild) return '<section class="personal-guild"><h2>Guild not assigned</h2><p>Your assignment will appear here when it’s ready. Your individual progress keeps counting.</p></section>';
  const rank = 1 + guild.members.filter(member => member.points > person.points).length;
  return `<section class="personal-guild">${guildCrest(guild)}<div><h2>${escape(guild.name)}</h2><p>You’re #${rank} of ${guild.members.length} in your guild · Guild #${guild.rank} overall</p><a href="#guild/${encodeURIComponent(guild.id)}" class="text-link">See your guild’s progress →</a></div></section>`;
}
