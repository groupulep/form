const fs = require('fs');

const path = 'src/components/AdminDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Colors replacement
content = content.replace(/slate-/g, 'zinc-');
content = content.replace(/purple-600/g, 'zinc-900');
content = content.replace(/purple-700/g, 'zinc-800');
content = content.replace(/purple-500/g, 'zinc-700');
content = content.replace(/purple-400/g, 'zinc-900'); // text
content = content.replace(/purple-200/g, 'zinc-200');
content = content.replace(/purple-50/g, 'zinc-50');

content = content.replace(/emerald-600/g, 'zinc-900');
content = content.replace(/emerald-700/g, 'zinc-800');
content = content.replace(/emerald-500/g, 'zinc-700');
content = content.replace(/emerald-400/g, 'zinc-900');
content = content.replace(/emerald-200/g, 'zinc-200');
content = content.replace(/emerald-50/g, 'zinc-50');

content = content.replace(/blue-600/g, 'zinc-900');
content = content.replace(/blue-700/g, 'zinc-800');
content = content.replace(/blue-500/g, 'zinc-700');
content = content.replace(/blue-400/g, 'zinc-900');
content = content.replace(/blue-200/g, 'zinc-200');
content = content.replace(/blue-50/g, 'zinc-50');

content = content.replace(/sky-600/g, 'zinc-900');
content = content.replace(/sky-700/g, 'zinc-800');
content = content.replace(/sky-500/g, 'zinc-700');
content = content.replace(/sky-400/g, 'zinc-900');
content = content.replace(/sky-200/g, 'zinc-200');
content = content.replace(/sky-50/g, 'zinc-50');

// Gradients remove
content = content.replace(/bg-gradient-to-tr from-zinc-700 via-zinc-700 to-zinc-700/g, 'bg-zinc-900');
content = content.replace(/bg-gradient-to-r from-zinc-900 to-zinc-900/g, 'bg-zinc-900');

// Shadows
content = content.replace(/shadow-xl/g, 'shadow-[0_8px_40px_rgb(0,0,0,0.04)]');
content = content.replace(/shadow-lg/g, 'shadow-[0_4px_20px_rgb(0,0,0,0.04)]');

fs.writeFileSync(path, content);
console.log('Updated AdminDashboard.tsx');
