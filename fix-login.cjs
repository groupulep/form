const fs = require('fs');
let content = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

const reps = [
  { regex: /via-purple-50\/20/g, replace: 'via-purple-900/20' },
  { regex: /to-emerald-50\/20/g, replace: 'to-emerald-900/20' },
  { regex: /from-purple-300\/60/g, replace: 'from-purple-900/60' },
  { regex: /via-blue-200\/40/g, replace: 'via-blue-900/40' },
  { regex: /to-emerald-300\/60/g, replace: 'to-emerald-900/60' },
  { regex: /from-purple-500 via-blue-500 to-emerald-400/g, replace: 'from-purple-800 via-blue-800 to-emerald-800' },
  { regex: /shadow-purple-500\/10/g, replace: 'shadow-purple-900/30' },
  { regex: /from-purple-600 to-blue-500/g, replace: 'from-purple-400 to-blue-400' },
  { regex: /from-purple-600 via-purple-700 to-indigo-600/g, replace: 'from-purple-900 via-blue-900 to-emerald-900' },
  { regex: /hover:from-purple-500 hover:to-indigo-500/g, replace: 'hover:from-purple-800 hover:to-emerald-800' },
  { regex: /shadow-purple-600\/15/g, replace: 'shadow-purple-900/40' },
  { regex: /hover:shadow-purple-600\/25/g, replace: 'hover:shadow-purple-900/60' },
  { regex: /focus:border-purple-400/g, replace: 'focus:border-purple-600' },
  { regex: /text-purple-500/g, replace: 'text-purple-400' },
];

reps.forEach(r => {
  content = content.replace(r.regex, r.replace);
});

fs.writeFileSync('src/components/LoginScreen.tsx', content, 'utf8');
