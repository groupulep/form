const fs = require('fs');
const path = require('path');

const files = [
  'src/App.tsx',
  'src/components/AdminDashboard.tsx',
  'src/components/SurveyScreen.tsx',
  'src/components/LoginScreen.tsx',
  'src/components/StatusIndicator.tsx'
];

const replacements = [
  // Backgrounds
  { regex: /\bbg-slate-50\b/g, replace: 'bg-slate-950' },
  { regex: /\bbg-white\b/g, replace: 'bg-slate-900' },
  { regex: /\bbg-slate-100\b/g, replace: 'bg-slate-800' },
  { regex: /\bbg-slate-200\b/g, replace: 'bg-slate-700' },
  { regex: /\bbg-slate-300\b/g, replace: 'bg-slate-600' },
  
  // Hover backgrounds
  { regex: /\bhover:bg-slate-50\b/g, replace: 'hover:bg-slate-900' },
  { regex: /\bhover:bg-slate-100\b/g, replace: 'hover:bg-slate-800' },
  { regex: /\bhover:bg-slate-200\b/g, replace: 'hover:bg-slate-700' },
  { regex: /\bhover:bg-white\b/g, replace: 'hover:bg-slate-800' },

  // Text colors
  { regex: /\btext-slate-900\b/g, replace: 'text-white' },
  { regex: /\btext-slate-800\b/g, replace: 'text-slate-100' },
  { regex: /\btext-slate-700\b/g, replace: 'text-slate-200' },
  { regex: /\btext-slate-600\b/g, replace: 'text-slate-300' },
  { regex: /\btext-slate-500\b/g, replace: 'text-slate-400' },
  { regex: /\btext-slate-400\b/g, replace: 'text-slate-500' },

  // Hover text colors
  { regex: /\bhover:text-slate-900\b/g, replace: 'hover:text-white' },
  { regex: /\bhover:text-slate-800\b/g, replace: 'hover:text-slate-100' },
  { regex: /\bhover:text-slate-700\b/g, replace: 'hover:text-slate-200' },
  { regex: /\bhover:text-slate-600\b/g, replace: 'hover:text-slate-300' },

  // Borders
  { regex: /\bborder-slate-100\b/g, replace: 'border-slate-800' },
  { regex: /\bborder-slate-200\b/g, replace: 'border-slate-700' },
  { regex: /\bborder-slate-300\b/g, replace: 'border-slate-600' },
  
  // Hover borders
  { regex: /\bhover:border-slate-200\b/g, replace: 'hover:border-slate-700' },
  { regex: /\bhover:border-slate-300\b/g, replace: 'hover:border-slate-600' },
  
  // Shadows (light to dark logic)
  { regex: /shadow-\[0_8px_40px_rgb\(0,0,0,0\.04\)\]/g, replace: 'shadow-[0_8px_40px_rgba(0,0,0,0.4)]' },

  // Gradients (from light to dark)
  { regex: /\bfrom-slate-50\b/g, replace: 'from-slate-900' },
  { regex: /\bto-slate-100\b/g, replace: 'to-slate-950' },
  { regex: /\bvia-white\b/g, replace: 'via-slate-800' },
  
  // Purples -> Dark purples & blues & greens
  { regex: /\bbg-purple-50\b/g, replace: 'bg-purple-950' },
  { regex: /\bbg-purple-100\b/g, replace: 'bg-purple-900' },
  { regex: /\bbg-purple-200\b/g, replace: 'bg-purple-800' },
  { regex: /\bbg-purple-500\b/g, replace: 'bg-indigo-700' },
  { regex: /\bbg-purple-600\b/g, replace: 'bg-indigo-800' },
  { regex: /\bbg-purple-700\b/g, replace: 'bg-indigo-900' },
  
  { regex: /\bhover:bg-purple-50\b/g, replace: 'hover:bg-purple-900\/50' },
  { regex: /\bhover:bg-purple-100\b/g, replace: 'hover:bg-purple-800' },
  { regex: /\bhover:bg-purple-600\b/g, replace: 'hover:bg-indigo-700' },
  { regex: /\bhover:bg-purple-700\b/g, replace: 'hover:bg-indigo-800' },

  { regex: /\btext-purple-600\b/g, replace: 'text-indigo-400' },
  { regex: /\btext-purple-700\b/g, replace: 'text-indigo-300' },
  { regex: /\btext-purple-800\b/g, replace: 'text-indigo-200' },
  { regex: /\btext-purple-900\b/g, replace: 'text-indigo-100' },
  { regex: /\btext-purple-950\b/g, replace: 'text-white' },

  { regex: /\bhover:text-purple-600\b/g, replace: 'hover:text-indigo-300' },
  { regex: /\bhover:text-purple-700\b/g, replace: 'hover:text-indigo-200' },
  
  { regex: /\bborder-purple-100\b/g, replace: 'border-indigo-800' },
  { regex: /\bborder-purple-200\b/g, replace: 'border-indigo-700' },
  { regex: /\bborder-purple-500\b/g, replace: 'border-indigo-500' },

  { regex: /\bring-purple-500\b/g, replace: 'ring-indigo-500' },
  
  // Emeralds -> Dark greens
  { regex: /\bbg-emerald-50\b/g, replace: 'bg-emerald-950' },
  { regex: /\bbg-emerald-100\b/g, replace: 'bg-emerald-900' },
  { regex: /\bbg-emerald-500\b/g, replace: 'bg-emerald-700' },
  { regex: /\bbg-emerald-600\b/g, replace: 'bg-emerald-800' },
  { regex: /\bbg-emerald-700\b/g, replace: 'bg-emerald-900' },
  
  { regex: /\bhover:bg-emerald-50\b/g, replace: 'hover:bg-emerald-900' },
  { regex: /\bhover:bg-emerald-600\b/g, replace: 'hover:bg-emerald-700' },
  { regex: /\bhover:bg-emerald-700\b/g, replace: 'hover:bg-emerald-800' },

  { regex: /\btext-emerald-500\b/g, replace: 'text-emerald-400' },
  { regex: /\btext-emerald-600\b/g, replace: 'text-emerald-400' },
  { regex: /\btext-emerald-700\b/g, replace: 'text-emerald-300' },
  { regex: /\btext-emerald-800\b/g, replace: 'text-emerald-200' },

  { regex: /\bborder-emerald-100\b/g, replace: 'border-emerald-800' },
  { regex: /\bborder-emerald-200\b/g, replace: 'border-emerald-700' },
  
  // Indigos -> Dark blues
  { regex: /\bbg-indigo-50\b/g, replace: 'bg-blue-950' },
  { regex: /\bfrom-purple-50\b/g, replace: 'from-indigo-950' },
  { regex: /\bto-indigo-50\b/g, replace: 'to-blue-950' },
  
  // Misc semi-transparent
  { regex: /\bbg-slate-50\/50\b/g, replace: 'bg-slate-950/50' },
  { regex: /\bbg-slate-50\/60\b/g, replace: 'bg-slate-950/60' },
  { regex: /\bbg-white\/50\b/g, replace: 'bg-slate-900/50' },
  { regex: /\btext-zinc-400\b/g, replace: 'text-zinc-500' },
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    replacements.forEach(({regex, replace}) => {
      content = content.replace(regex, replace);
    });
    fs.writeFileSync(file, content, 'utf8');
  }
});
