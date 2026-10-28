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
].map(([id, title, category, template, asset, icon]) => ({ id, title, category, url: `https://www.skills.google/course_templates/${template}`, asset, icon }));

const first = ['Ananya Sharma', 'Kabir Mehta', 'Meera Iyer', 'Rohan Verma', 'Aarav Kulkarni', 'Ishita Rao'];
const firstNames = ['Aditi', 'Arjun', 'Devika', 'Neel', 'Tanvi', 'Sahil', 'Kavya', 'Dhruv', 'Sanya', 'Pranav', 'Ayesha', 'Vedant', 'Diya', 'Ishan', 'Ritika', 'Yash', 'Nisha', 'Siddharth', 'Avni', 'Harsh'];
const surnames = ['Joshi', 'Bansal', 'Mishra', 'Nair', 'Sen', 'Gupta', 'Bhat', 'Desai', 'Saxena', 'Jain', 'Chauhan', 'Singh', 'Pandey', 'Shah', 'Reddy', 'Kapoor', 'Sethi', 'Das', 'Soni', 'Mathur', 'Agarwal', 'Kumar', 'Patel', 'Malhotra', 'Roy'];
export const participants = Array.from({ length: 500 }, (_, index) => {
  const name = first[index] || `${firstNames[(index - 6) % 20]} ${surnames[Math.floor((index - 6) / 20)]}`;
  const points = index < 6 ? 840 - index * 30 : index > 485 ? 0 : Math.max(1, 684 - Math.floor((index - 6) * 1.4));
  const badges = index === 4 ? 7 : Math.min(10, Math.max(0, Math.round(points / 90)));
  return {
    id: `demo-${index + 1}`, name: index === 147 ? 'Venkata Sai Abhinav Narayanaswamy' : index === 499 ? 'Nandini Patel' : name,
    guildId: index === 499 ? 'Solo' : [2, 3, 4].includes(index) ? 'Orbit' : guilds[index % 7].id,
    rank: index + 1, points, badges, currentStreak: index === 4 ? 3 : index % 5, bestStreak: index === 4 ? 5 : Math.max(index % 5, index % 9),
    // A UI hint supplied by the mock adapter; no scoring rule in presentation.
    nextRankGap: index === 4 ? 31 : index === 0 ? null : Math.max(1, (index <= 5 ? 31 : 3)),
    milestone: badges >= 10 ? 'Curriculum complete' : badges >= 5 ? 'Halfway there' : 'Getting started',
  };
});
// Intentional tie and no-streak fixture.
participants[7].points = participants[6].points;
participants[7].rank = participants[6].rank;
export function guildSummary(id) {
  const members = participants.filter(p => p.guildId === id);
  return { ...guilds.find(g => g.id === id), members, total: members.reduce((sum, p) => sum + p.points, 0), completed: members.filter(p => p.badges >= 5).length };
}
