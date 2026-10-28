// Each direction changes presentation only. Participants and scoring stay shared.
export const designs = {
  clubhouse: { name: 'Guild Clubhouse', description: 'Your guild, in good company.' },
  canvas: { name: 'Campus Canvas', description: 'A little curiosity. Ten discoveries.' },
  builders: { name: 'Builders League', description: 'Your next move, a little closer.' },
};

export const shortCourseNames = ['Compute', 'IAM', 'Speech AI', 'AI Studio', 'Vision', 'Website', 'Gemini', 'Cloud data', 'Speech API', 'Gen AI'];

export function courseLens(course, index, person, helpers) {
  const { icon, escape, courseIcon } = helpers;
  return `<span class="lens-icon">${courseIcon(course)}</span><div><span class="lens-state">${index < person.badges ? 'Collected in your sample profile' : 'Your next discovery'}</span><strong>${escape(course.title)}</strong></div><a href="${course.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escape(course.title)} on Google Skills">${icon('arrow-up-right')}</a>`;
}

function programLabel() {
  return `<div class="program-label"><img src="/assets/google-cloud-logo.svg" width="123" height="20" alt="Google Cloud"><span>Study Jam 2026</span><span class="sample-label">Sample data</span></div>`;
}

export function canvasHero(person, courses, helpers) {
  const { icon, escape, courseIcon } = helpers;
  return `<section class="canvas-intro">
    <div class="canvas-copy">${programLabel()}
      <h1>A little curiosity.<br><span>A lot to collect.</span></h1>
      <p>For the cloud builders of ABV-IIITM.<br>Find your guild. Make your next discovery.</p>
      <div class="hero-actions"><button class="button primary" data-find>Find my place ${icon('arrow-up-right')}</button><button class="text-button" data-standings>See standings ${icon('arrow-right')}</button></div>
      <div class="canvas-event-note">${icon('users-three')} 500 learners <span>Study Jam ends 22 November</span></div>
    </div>
    <div class="canvas-collector"><div class="collector-heading"><span>${icon('sparkle')} Ten skills, yours to collect</span><strong>${person.badges}<small>/10</small></strong></div>
      <div class="canvas-badges" role="group" aria-label="Explore the ten curriculum badges">${courses.map((course, index) => `<button class="canvas-badge ${index < person.badges ? 'is-collected' : ''}" data-course-preview="${index}" aria-pressed="${index === 0}" aria-label="Preview ${escape(course.title)}" style="--badge-index:${index}"><span>${courseIcon(course)}<i>${icon(index < person.badges ? 'check' : 'lock-simple')}</i></span><strong>${shortCourseNames[index]}</strong></button>`).join('')}</div>
      <p class="collector-hint">Tap a badge. Find your next thing.</p>
      <div id="course-lens" class="course-lens" aria-live="polite">${courseLens(courses[0], 0, person, helpers)}</div>
      <div class="collector-owner">Collecting with <strong>${escape(person.name)}</strong><span>Guild ${person.guildId}</span></div>
    </div>
  </section>`;
}

export function buildersHero(person, participants, helpers) {
  const { icon, escape, initials } = helpers;
  const current = participants.findIndex(p => p.id === person.id);
  const nearby = participants.slice(Math.max(0, current - 1), Math.max(0, current - 1) + 3);
  return `<section class="builders-intro">
    ${programLabel()}
    <div class="builders-heading"><div><h1>Build skills.<br><span>Make your move.</span></h1><p>A little friendly rivalry.<br>A whole campus cheering you on.</p></div>
      <div class="builders-actions"><button class="button primary" data-find>Find my place ${icon('arrow-up-right')}</button><button class="text-button" data-standings>See standings ${icon('arrow-right')}</button><span>ABV-IIITM students. All levels welcome.</span></div>
    </div>
    <div class="rivalry-heading"><h2>${person.rank === 1 ? 'You’re setting the pace.' : 'Your next place is closer than you think.'}</h2><span>${person.rank === 1 ? 'Keep exploring' : `${person.nextRankGap} points to the next place`}</span></div>
    <div class="rivalry-track">${nearby.map(p => `<a class="rivalry-person ${p.id === person.id ? 'current' : ''}" href="#profile/${p.id}"><span class="rivalry-rank">${String(p.rank).padStart(2, '0')}</span><span class="rivalry-avatar">${initials(p.name)}</span><span class="rivalry-name"><strong>${escape(p.name)}</strong><small>${p.id === person.id ? 'Your place' : p.guildId}</small></span><span class="rivalry-points">${p.points}<small>points</small></span>${icon('arrow-up-right')}</a>`).join('')}</div>
    <div class="builders-caption"><span>${icon('flag')} Build at your pace. Climb together.</span><span>500 learners <i></i> 8 guilds <i></i> 10 badges</span></div>
  </section>`;
}
