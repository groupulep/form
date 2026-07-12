const fs = require('fs');

function restoreColors(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Undo zinc backgrounds
  content = content.replace(/bg-zinc-50/g, 'bg-slate-50');
  content = content.replace(/bg-zinc-100/g, 'bg-slate-100');
  content = content.replace(/bg-zinc-200/g, 'bg-slate-200');
  content = content.replace(/bg-zinc-900/g, 'bg-purple-600');
  content = content.replace(/bg-zinc-800/g, 'bg-purple-700');
  
  // Undo zinc text
  content = content.replace(/text-zinc-900/g, 'text-slate-900');
  content = content.replace(/text-zinc-800/g, 'text-slate-800');
  content = content.replace(/text-zinc-700/g, 'text-slate-700');
  content = content.replace(/text-zinc-600/g, 'text-slate-600');
  content = content.replace(/text-zinc-500/g, 'text-slate-500');
  content = content.replace(/text-zinc-400/g, 'text-slate-400');
  content = content.replace(/text-zinc-300/g, 'text-slate-300');
  
  // Undo zinc borders
  content = content.replace(/border-zinc-100/g, 'border-slate-100');
  content = content.replace(/border-zinc-200/g, 'border-slate-200');
  content = content.replace(/border-zinc-300/g, 'border-slate-300');
  content = content.replace(/border-zinc-400/g, 'border-slate-400');
  content = content.replace(/border-zinc-800/g, 'border-purple-600');
  content = content.replace(/border-zinc-900/g, 'border-purple-600');
  
  // Undo zinc rings
  content = content.replace(/ring-zinc-900\/5/g, 'ring-purple-500/20');
  content = content.replace(/ring-zinc-900/g, 'ring-purple-600');
  
  // Undo shadow-zinc
  content = content.replace(/shadow-zinc-900\/10/g, 'shadow-purple-900/10');
  content = content.replace(/shadow-zinc-200/g, 'shadow-purple-200');
  
  fs.writeFileSync(path, content);
}

restoreColors('src/components/AdminDashboard.tsx');
restoreColors('src/components/SurveyScreen.tsx');
restoreColors('src/components/LoginScreen.tsx');
restoreColors('src/App.tsx');
restoreColors('src/components/StatusIndicator.tsx');

console.log('Colors restored.');
