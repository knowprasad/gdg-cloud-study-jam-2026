const components = ['badges', 'streak', 'earlyFinish', 'attendance', 'activities', 'bingo', 'xp'];
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

// Reject unknown fields rather than accidentally publishing organizer metadata.
function fields(record, allowed) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      Object.keys(record).some(key => !allowed.includes(key))) {
    throw new Error('Unexpected snapshot fields.');
  }
}

export function validateSnapshot(input) {
  fields(input, ['schemaVersion', 'rulesVersion', 'updatedAt', 'participants', 'guilds', 'xpRule']);
  if (input.xpRule !== undefined) {
    fields(input.xpRule, ['perPoint', 'cap']);
    if (!finite(input.xpRule.perPoint) || input.xpRule.perPoint === 0 || !finite(input.xpRule.cap)) throw new Error('Invalid XP settings');
  }
  if (input.schemaVersion !== 1 || typeof input.rulesVersion !== 'string' ||
      !timestamp(input.updatedAt) || !Array.isArray(input.participants) ||
      !input.participants.length || !Array.isArray(input.guilds)) {
    throw new Error('Invalid snapshot metadata.');
  }
  const ids = new Set();
  for (const person of input.participants) {
    fields(person, ['id', 'name', 'guildId', 'rank', 'points', 'badgesCompleted', 'scoreBreakdown', 'badgeDetails', 'approvedActivities', 'bestStreak']);
    if (person.badgeDetails !== undefined) {
      if (!Array.isArray(person.badgeDetails)) throw new Error('Invalid badge evidence');
      for (const badge of person.badgeDetails) {
        fields(badge, ['id', 'date', 'points']);
        if (!['compute','iam','speech','studio','vision','website','gemini','data','speech-api','gen-ai'].includes(badge.id) ||
            typeof badge.date !== 'string' || !finite(badge.points)) throw new Error('Invalid badge evidence');
      }
    }
    if (person.approvedActivities !== undefined && (!Array.isArray(person.approvedActivities) ||
        person.approvedActivities.some(id => !['first-badge','credits','ai-studio','kickoff','five-badges','story','second-session','community','instagram','ten-badges'].includes(id)))) throw new Error('Invalid activity');
    if (person.bestStreak !== undefined && !finite(person.bestStreak)) throw new Error('Invalid streak');
    if (typeof person.id !== 'string' || !/^p-[a-f0-9]{32}$/.test(person.id) || ids.has(person.id) ||
        typeof person.name !== 'string' || !person.name.trim() || person.name.length > 160 ||
        !Number.isInteger(person.rank) || person.rank < 1 || !finite(person.points) ||
        !Number.isInteger(person.badgesCompleted) || person.badgesCompleted < 0 || person.badgesCompleted > 10) {
      throw new Error('Invalid public participant.');
    }
    ids.add(person.id);
    fields(person.scoreBreakdown, components);
    if (!components.every(key => finite(person.scoreBreakdown[key])) ||
        // Source reports round individual bonuses and the final total separately.
        Math.abs(components.reduce((sum, key) => sum + person.scoreBreakdown[key], 0) - person.points) > 0.11) {
      throw new Error('Score components do not reconcile.');
    }
  }
  const guildIds = new Set();
  for (const guild of input.guilds) {
    fields(guild, ['id', 'name', 'headId']);
    if (guild.headId !== undefined && guild.headId !== null && !ids.has(guild.headId)) throw new Error('Unknown guild head');
    if (typeof guild.id !== 'string' || typeof guild.name !== 'string' || !guild.name.trim() || guildIds.has(guild.id)) {
      throw new Error('Invalid guild.');
    }
    guildIds.add(guild.id);
  }
  if (input.participants.some(person => person.guildId !== null && !guildIds.has(person.guildId))) {
    throw new Error('Unknown guild assignment.');
  }
  return input;
}
