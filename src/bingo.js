export const bingoTasks = [
  {
    id: 'first-badge',
    title: 'First cloud badge',
    detail: 'Complete any curriculum badge.',
  },
  {
    id: 'credits',
    title: 'Credits redeemed',
    detail: 'Redeem your Google Cloud learning credits. Organizer confirmation required.',
  },
  {
    id: 'ai-studio',
    title: 'Explore AI Studio',
    detail: 'Complete Develop AI-Powered Prototypes in Google AI Studio.',
    url: 'https://www.skills.google/course_templates/1426',
  },
  {
    id: 'kickoff',
    title: 'First session',
    detail: 'Attend the credit-redemption session on 25 October 2026.',
  },
  {
    id: 'five-badges',
    title: 'Halfway there',
    detail: 'Complete five curriculum badges.',
  },
  {
    id: 'story',
    title: 'Share your cloud story',
    detail: 'Create your card, post it on Instagram and tag @gdg_oncampus_iiitm. Organizer approval earns 2 points.',
    url: 'https://iiitm-cloud-stories-review.vercel.app/',
  },
  {
    id: 'second-session',
    title: 'Learn together again',
    detail: 'Attend another eligible session. Its date will be announced by organizers.',
  },
  {
    id: 'community',
    title: 'Join our community',
    detail: 'Join the official campus GDG page. Organizer approval earns 2 points.',
    url: 'https://gdg.community.dev/gdg-on-campus-atal-bihari-vajpayee-indian-institute-of-information-technology-and-management-gwalior-india/',
  },
  {
    id: 'ten-badges',
    title: 'All ten, collected',
    detail: 'Complete all ten curriculum badges.',
  },
];

export function bingoProgress(person) {
  const approved = new Set(person.approvedActivities || []);
  const pending = new Set(person.pendingActivities || []);
  const badgeIds = new Set((person.scoreBreakdown?.badgeDetails || []).map(badge => badge.id));

  const complete = {
    'first-badge': badgeIds.size >= 1,
    credits: approved.has('credits'),
    'ai-studio': badgeIds.has('studio'),
    kickoff: approved.has('kickoff'),
    'five-badges': badgeIds.size >= 5,
    story: approved.has('story'),
    'second-session': approved.has('second-session'),
    community: approved.has('community'),
    'ten-badges': badgeIds.size >= 10,
  };

  const tasks = bingoTasks.map(task => ({
    ...task,
    status: complete[task.id] ? 'complete' : pending.has(task.id) ? 'pending' : 'open',
  }));
  const count = tasks.filter(task => task.status === 'complete').length;

  return {
    tasks,
    count,
    complete: count === bingoTasks.length,
    isSample: person.synthetic !== false,
    activityPoints: Number(approved.has('story')) * 2 + Number(approved.has('community')) * 2,
    bonus: count === bingoTasks.length ? 5 : 0,
  };
}

function taskStatusLabel(status, isSample) {
  if (status === 'complete') return isSample ? 'Example complete' : 'Verified';
  if (status === 'pending') return isSample ? 'Example pending' : 'Awaiting approval';
  return 'To explore';
}

function taskLinkLabel(id) {
  if (id === 'story') return 'Make your story card';
  if (id === 'community') return 'Open community page';
  return 'Open course';
}

export function bingoView(person, escape) {
  const progress = bingoProgress(person);
  const milestones = [
    ['First badge', person.badges >= 1],
    ['Five badges', person.badges >= 5],
    ['Curriculum complete', person.badges >= 10],
    ['Bingo complete', progress.complete],
  ];

  return `
    <section class="cloud-bingo" aria-labelledby="bingo-title">
      <div class="bingo-heading">
        <div>
          <h2 id="bingo-title">Your cloud bingo.</h2>
          <p>Nine steps. One campus adventure.</p>
        </div>
        <strong>${progress.count}<small> / ${bingoTasks.length}</small></strong>
      </div>
      <progress max="${bingoTasks.length}" value="${progress.count}" aria-label="Bingo completion"></progress>
      <div class="bingo-grid">
        ${progress.tasks.map((task, index) => `
          <details class="bingo-square ${task.status}">
            <summary>
              <span class="bingo-mark" aria-hidden="true">${task.status === 'complete' ? '✓' : String(index + 1).padStart(2, '0')}</span>
              <strong>${task.title}</strong>
              <span class="bingo-status">${taskStatusLabel(task.status, progress.isSample)}</span>
            </summary>
            <p>${task.detail}</p>
            ${task.url ? `<a href="${task.url}" target="_blank" rel="noopener noreferrer">${taskLinkLabel(task.id)} ↗</a>` : ''}
          </details>
        `).join('')}
      </div>
      <div class="bingo-reward">
        <div>
          <h3>${progress.complete ? 'Cloud Bingo complete!' : 'The final piece is yours.'}</h3>
          <p>${progress.complete
            ? 'Your one-time 5-point bonus is included in your total.'
            : 'Complete all nine verified squares to earn 5 bonus points and unlock your share card.'}</p>
        </div>
        <button class="button primary" data-bingo-download ${progress.complete ? '' : 'disabled'}>Download completion card</button>
        <button class="text-button" data-bingo-caption ${progress.complete ? '' : 'disabled'}>Copy caption</button>
      </div>
      <div class="milestone-ribbon" aria-label="Personal milestones">
        ${milestones.map(([label, earned]) => `
          <span class="${earned ? 'earned' : ''}">${earned ? '✓' : '○'} ${label}</span>
        `).join('')}
      </div>
      <p class="bingo-note">${escape(person.name)} · ${progress.isSample
        ? 'Sample progress only; example completions are not organizer-verified.'
        : 'Organizer approval is required for manual activities. Opening a link does not award points.'}</p>
    </section>
  `;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
  let line = '';

  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = candidate;
    }
  }

  context.fillText(line, x, y);
  return y + lineHeight;
}

function drawBingoTask(context, task, index, tileSize, gap) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = 90 + column * (tileSize + gap);
  const y = 620 + row * 295;

  context.fillStyle = '#e9f0e4';
  context.beginPath();
  context.roundRect(x, y, tileSize, 270, 24);
  context.fill();

  context.fillStyle = '#326548';
  context.font = '700 40px Manrope';
  context.fillText('✓', x + 24, y + 58);
  context.font = '600 29px Manrope';
  drawWrappedText(context, task.title, x + 24, y + 116, tileSize - 48, 39);
}

function downloadCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to create card.')), 'image/png');
  });
}

export async function downloadBingo(person) {
  if (!bingoProgress(person).complete) {
    throw new Error('Complete all verified squares first.');
  }

  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not create the card.');

  context.fillStyle = '#e8f5ff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff';
  context.beginPath();
  context.roundRect(55, 55, 970, 1810, 44);
  context.fill();

  const logo = new Image();
  logo.src = '/assets/gdg-gwalior-badge.webp';
  await logo.decode();
  context.drawImage(logo, 90, 90, 130, 130);

  context.fillStyle = '#26352d';
  context.font = '600 27px Manrope';
  context.fillText('GDG on Campus', 245, 143);
  context.font = '24px Manrope';
  context.fillText('ABV-IIITM Gwalior', 245, 184);

  context.fillStyle = '#326548';
  context.font = '800 80px Manrope';
  context.fillText('CLOUD BINGO', 90, 330);
  context.font = '700 48px Manrope';
  context.fillText('Nine steps. All yours.', 90, 406);

  context.fillStyle = '#26352d';
  context.font = '600 40px Manrope';
  drawWrappedText(context, person.name, 90, 500, 900, 50);

  const tileSize = 280;
  const gap = 25;
  bingoTasks.forEach((task, index) => drawBingoTask(context, task, index, tileSize, gap));

  context.fillStyle = '#fbbc05';
  context.beginPath();
  context.roundRect(90, 1550, 890, 95, 47);
  context.fill();
  context.fillStyle = '#26352d';
  context.textAlign = 'center';
  context.font = '800 36px Manrope';
  context.fillText('BINGO COMPLETE · +5 POINTS', 535, 1610);
  context.font = '26px Manrope';
  context.fillText('Cloud Study Jam 2026 · @gdg_oncampus_iiitm', 540, 1725);
  context.font = '22px Manrope';
  context.fillText(
    person.synthetic === false ? 'GDG ON CAMPUS · ABV-IIITM' : 'SAMPLE CARD · FICTIONAL PREVIEW DATA',
    540,
    1790,
  );

  const blob = await downloadCanvas(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cloud-bingo-complete.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
