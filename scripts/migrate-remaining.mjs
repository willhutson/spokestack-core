import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Find ALL remaining files with hardcoded colors
const output = execSync(
  'grep -rl "bg-gray-\\|bg-indigo-\\|text-gray-\\|text-indigo-\\|border-gray-\\|border-indigo-\\|bg-white\\b\\|divide-gray-\\|placeholder-gray-\\|ring-indigo-" src/ --include="*.tsx" --include="*.ts" 2>/dev/null',
  { encoding: 'utf-8' }
).trim();

const files = output.split('\n').filter(Boolean);
console.log(`Found ${files.length} files to migrate`);

// Lines containing these patterns should NOT be modified (semantic status colors)
const SKIP_PATTERNS = [
  /STATUS_STYLES/i, /STATUS_COLORS/i, /SEVERITY_COLORS/i, /COL_COLORS/i, /COLUMN_COLORS/i,
  /bg-red-/, /text-red-/, /border-red-/,
  /bg-green-/, /text-green-/, /border-green-/,
  /bg-emerald-/, /text-emerald-/, /border-emerald-/,
  /bg-amber-/, /text-amber-/, /border-amber-/,
  /bg-blue-/, /text-blue-/, /border-blue-/,
  /bg-purple-/, /text-purple-/, /border-purple-/,
  /bg-yellow-/, /text-yellow-/, /border-yellow-/,
  /bg-orange-/, /text-orange-/,
  /bg-pink-/, /text-pink-/,
  /bg-teal-/, /text-teal-/,
  /bg-cyan-/, /text-cyan-/,
];

function shouldSkipLine(line) {
  return SKIP_PATTERNS.some(p => p.test(line));
}

const replacements = [
  // Backgrounds
  [/\bbg-white\b/g, 'bg-[var(--bg-base)]'],
  [/\bbg-gray-50\b/g, 'bg-[var(--bg-base)]'],
  [/\bbg-gray-100\b/g, 'bg-[var(--bg-surface)]'],
  [/\bbg-gray-200\b/g, 'bg-[var(--bg-surface)]'],
  [/\bbg-gray-300\b/g, 'bg-[var(--bg-hover)]'],
  [/\bbg-gray-800\b/g, 'bg-[var(--bg-surface)]'],
  [/\bbg-gray-900\b/g, 'bg-[var(--bg-base)]'],
  [/\bbg-indigo-50\b/g, 'bg-[var(--accent-subtle)]'],
  [/\bbg-indigo-100\b/g, 'bg-[var(--accent-subtle)]'],
  [/\bbg-indigo-600\b/g, 'bg-[var(--accent)]'],
  [/\bbg-indigo-700\b/g, 'bg-[var(--accent)]'],
  [/\bbg-indigo-500\b/g, 'bg-[var(--accent)]'],
  [/\bbg-indigo-400\b/g, 'bg-[var(--accent)]'],
  
  // Text
  [/\btext-gray-900\b/g, 'text-[var(--text-primary)]'],
  [/\btext-gray-800\b/g, 'text-[var(--text-primary)]'],
  [/\btext-gray-700\b/g, 'text-[var(--text-secondary)]'],
  [/\btext-gray-600\b/g, 'text-[var(--text-secondary)]'],
  [/\btext-gray-500\b/g, 'text-[var(--text-secondary)]'],
  [/\btext-gray-400\b/g, 'text-[var(--text-tertiary)]'],
  [/\btext-gray-300\b/g, 'text-[var(--text-tertiary)]'],
  [/\btext-indigo-600\b/g, 'text-[var(--accent)]'],
  [/\btext-indigo-700\b/g, 'text-[var(--accent)]'],
  [/\btext-indigo-500\b/g, 'text-[var(--accent)]'],
  
  // Borders
  [/\bborder-gray-200\b/g, 'border-[var(--border)]'],
  [/\bborder-gray-100\b/g, 'border-[var(--border)]'],
  [/\bborder-gray-300\b/g, 'border-[var(--border-strong)]'],
  [/\bborder-indigo-600\b/g, 'border-[var(--accent)]'],
  [/\bborder-indigo-500\b/g, 'border-[var(--accent)]'],
  [/\bborder-indigo-200\b/g, 'border-[var(--accent)]'],
  [/\bborder-indigo-100\b/g, 'border-[var(--accent)]'],
  
  // Divide
  [/\bdivide-gray-200\b/g, 'divide-[var(--border)]'],
  [/\bdivide-gray-100\b/g, 'divide-[var(--border)]'],
  
  // Hover
  [/\bhover:bg-gray-50\b/g, 'hover:bg-[var(--bg-hover)]'],
  [/\bhover:bg-gray-100\b/g, 'hover:bg-[var(--bg-hover)]'],
  [/\bhover:bg-gray-200\b/g, 'hover:bg-[var(--bg-hover)]'],
  [/\bhover:bg-indigo-700\b/g, 'hover:bg-[var(--accent-hover)]'],
  [/\bhover:bg-indigo-600\b/g, 'hover:bg-[var(--accent-hover)]'],
  [/\bhover:text-gray-700\b/g, 'hover:text-[var(--text-primary)]'],
  [/\bhover:text-gray-900\b/g, 'hover:text-[var(--text-primary)]'],
  [/\bhover:text-indigo-700\b/g, 'hover:text-[var(--accent-hover)]'],
  [/\bhover:text-indigo-600\b/g, 'hover:text-[var(--accent-hover)]'],
  [/\bhover:bg-indigo-50\b/g, 'hover:bg-[var(--accent-subtle)]'],
  [/\bhover:bg-indigo-100\b/g, 'hover:bg-[var(--accent-subtle)]'],
  
  // Focus/Ring
  [/\bfocus:ring-indigo-500\b/g, 'focus:ring-[var(--accent)]'],
  [/\bfocus:ring-indigo-400\b/g, 'focus:ring-[var(--accent)]'],
  [/\bring-indigo-500\b/g, 'ring-[var(--accent)]'],
  [/\bring-indigo-400\b/g, 'ring-[var(--accent)]'],
  [/\bfocus:border-indigo-500\b/g, 'focus:border-[var(--accent)]'],
  
  // Placeholder
  [/\bplaceholder-gray-400\b/g, 'placeholder-[var(--text-tertiary)]'],
  [/\bplaceholder-gray-500\b/g, 'placeholder-[var(--text-tertiary)]'],
];

let totalChanged = 0;

for (const file of files) {
  const fullPath = resolve(file);
  if (!existsSync(fullPath)) continue;
  
  const original = readFileSync(fullPath, 'utf-8');
  const lines = original.split('\n');
  let changed = false;
  
  const newLines = lines.map(line => {
    // Skip lines with semantic status color definitions
    if (shouldSkipLine(line)) return line;
    
    let newLine = line;
    for (const [pattern, replacement] of replacements) {
      newLine = newLine.replace(pattern, replacement);
    }
    
    // Handle text-white only when it's next to an accent bg
    if (newLine.includes('text-white') && (newLine.includes('bg-[var(--accent)]') || newLine.includes('bg-primary'))) {
      newLine = newLine.replace(/\btext-white\b/g, 'text-[var(--primary-foreground)]');
    }
    
    if (newLine !== line) changed = true;
    return newLine;
  });
  
  if (changed) {
    writeFileSync(fullPath, newLines.join('\n'));
    totalChanged++;
    console.log(`DONE: ${file}`);
  }
}

console.log(`\nMigrated ${totalChanged} files`);
