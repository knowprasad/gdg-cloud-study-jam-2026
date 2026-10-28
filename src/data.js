import { bingoProgress } from './bingo.js';
import { scoreProgress, rankParticipants } from './scoring.js';
// Synthetic preview data only. Event scoring belongs to the future pipeline.
export const guilds = [
  { id: 'Orbit', color: 'blue', symbol: 'sparkle', motto: 'A little further, together.' },
  { id: 'Vertex', color: 'green', symbol: 'mountains', motto: 'Find your next high point.' },
  { id: 'Nimbus', color: 'amber', symbol: 'cloud', motto: 'Good things are taking shape.' },
  { id: 'Atlas', color: 'rose', symbol: 'flag', motto: 'Make a little room for discovery.' },
  { id: 'Terra', color: 'green', symbol: 'plant', motto: 'Small steps. Steady growth.' },
  { id: 'Helix', color: 'blue', symbol: 'lightning', motto: 'Keep the momentum going.' },
  { id: 'Stratus', color: 'amber', symbol: 'mountains', motto: 'Learn beyond the familiar.' },
  { id: 'Solo', color: 'rose', symbol: 'star', motto: 'Every beginning belongs here.' },
];
export const courses = [
  ['compute', 'The Basics of Google Cloud Compute', 'Cloud foundations', '754', 'compute.png', 'cloud'],
  ['iam', 'Configure Service Accounts and IAM Roles for Google Cloud', 'Security', '702', null, 'shield-check'],
  ['speech', 'Implement Speech and Language Solutions with Pre-trained APIs', 'AI & machine learning', '700', null, 'microphone'],
  ['studio', 'Develop AI-Powered Prototypes in Google AI Studio', 'Generative AI', '1426', null, 'sparkle'],
  ['vision', 'Analyze Images with the Cloud Vision API', 'AI & machine learning', '633', null, 'eye'],
  ['website', 'Build a Website on Google Cloud', 'Cloud foundations', '638', null, 'code'],
  ['gemini', 'Create Your First Gemini Enterprise Application', 'Generative AI', '1586', null, 'sparkle'],
  ['data', 'Store, Process, and Manage Data on Google Cloud - Console', 'Data', '658', 'storage.png', 'cloud'],
  ['speech-api', 'Using the Google Cloud Speech API', 'AI & machine learning', '756', null, 'microphone'],
  ['gen-ai', 'Explore Generative AI in Agent Platform', 'Generative AI', '959', null, 'sparkle'],
].map(([id, title, category, template, asset, icon], index) => ({ id, title, category, credits: [4,4,4,0,12,13,0,3,4,16][index], url: `https://www.skills.google/course_templates/${template}`, asset, icon }));

const first = ['Ananya Sharma', 'Kabir Mehta', 'Meera Iyer', 'Rohan Verma', 'Aarav Kulkarni', 'Ishita Rao'];
const firstNames = ['Aditi', 'Arjun', 'Devika', 'Neel', 'Tanvi', 'Sahil', 'Kavya', 'Dhruv', 'Sanya', 'Pranav', 'Ayesha', 'Vedant', 'Diya', 'Ishan', 'Ritika', 'Yash', 'Nisha', 'Siddharth', 'Avni', 'Harsh'];
const surnames = ['Joshi', 'Bansal', 'Mishra', 'Nair', 'Sen', 'Gupta', 'Bhat', 'Desai', 'Saxena', 'Jain', 'Chauhan', 'Singh', 'Pandey', 'Shah', 'Reddy', 'Kapoor', 'Sethi', 'Das', 'Soni', 'Mathur', 'Agarwal', 'Kumar', 'Patel', 'Malhotra', 'Roy'];
export const participants = Array.from({ length: 500 }, (_, index) => {
  const name = first[index] || `${firstNames[(index - 6) % 20]} ${surnames[Math.floor((index - 6) / 20)]}`;
  const points = index < 6 ? 840 - index * 30 : index > 485 ? 0 : Math.max(1, 684 - Math.floor((index - 6) * 1.4));
  const badges = index < 2 ? 10 : index === 4 ? 7 : Math.min(10, Math.max(0, Math.round(points / 90)));
  return {
    id: `demo-${index + 1}`, name: index === 147 ? 'Venkata Sai Abhinav Narayanaswamy' : index === 499 ? 'Nandini Patel' : name,
    guildId: index === 499 ? 'Solo' : [2, 3, 4].includes(index) ? 'Orbit' : guilds[index % 7].id,
    rank: index + 1, points, badges, currentStreak: index === 4 ? 3 : index % 5, bestStreak: index === 4 ? 5 : Math.max(index % 5, index % 9),
    // A UI hint supplied by the mock adapter; no scoring rule in presentation.
    nextRankGap: index === 4 ? 31 : index === 0 ? null : Math.max(1, (index <= 5 ? 31 : 3)),
    milestone: badges >= 10 ? 'Curriculum complete' : badges >= 5 ? 'Halfway there' : 'Getting started',
  };
});
// Synthetic evidence, calculated under the published rules. No real learner data.
participants.forEach((p, index) => {
  const run = Math.min(p.badges, p.bestStreak || (p.badges ? 1 : 0));
  const completions = courses.slice(0, p.badges).map((c, i) => ({ id: c.id,
    date: new Date(Date.UTC(2026, 9, 20 - Math.max(0, run - 1) + Math.min(i, Math.max(0, run - 1)))).toISOString().slice(0, 10) }));
  const attendance = Array.from({length: p.badges ? index % 4 : 0}, (_, i) => ({id: `demo-session-${i + 1}`, date: `2026-10-${String(12 + i).padStart(2, '0')}`}));
  p.scoreBreakdown = scoreProgress(completions, attendance, courses);
  p.points = p.scoreBreakdown.total; p.bestStreak = p.scoreBreakdown.bestStreak;
  p.currentStreak = 0; // The mock snapshot is 28 Oct; evidence ends on 20 Oct.
  p.lifetimeXp = p.badges * 100;
});
participants.forEach((p,i)=>{
 p.approvedActivities=p.id==='demo-1'?['credits','kickoff','story','second-session','instagram']:p.badges?['credits',...(i%3===0?['kickoff']:[]),...(i%4===0?['instagram']:[])]:[];
 p.pendingActivities=p.id==='demo-5'?['story']:[];
 const verifiedSessions=['kickoff','second-session'].filter(id=>p.approvedActivities.includes(id)).length;
 p.scoreBreakdown.total-=p.scoreBreakdown.attendance;p.scoreBreakdown.sessions=verifiedSessions;p.scoreBreakdown.attendance=verifiedSessions*2;p.scoreBreakdown.total+=p.scoreBreakdown.attendance;
 const b=bingoProgress(p);p.scoreBreakdown.activities=b.activityPoints;p.scoreBreakdown.bingo=b.bonus;
 p.scoreBreakdown.total=Math.round((p.scoreBreakdown.total+b.activityPoints+b.bonus)*10)/10;p.points=p.scoreBreakdown.total;
});
rankParticipants(participants);
export function guildSummary(id) {
  const members = participants.filter(p => p.guildId === id);
  return { ...guilds.find(g => g.id === id), members, total: members.reduce((sum, p) => sum + p.points, 0), completed: members.filter(p => p.badges >= 5).length, average: members.length ? Math.round(members.reduce((sum, p) => sum + p.points, 0) / members.length * 10) / 10 : 0 };
}
