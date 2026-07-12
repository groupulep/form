const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/bg-slate-50/g, 'bg-zinc-50');
content = content.replace(/bg-purple-600/g, 'bg-zinc-900');
content = content.replace(/bg-purple-700/g, 'bg-zinc-800');

fs.writeFileSync(path, content);
console.log('Updated App.tsx');
