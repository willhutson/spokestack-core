import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const files = [
  'src/app/(dashboard)/analytics/page.tsx',
  'src/app/(dashboard)/analytics/AnalyticsNav.tsx',
  'src/app/(dashboard)/analytics/campaigns/page.tsx',
  'src/app/(dashboard)/analytics/platforms/page.tsx',
  'src/app/(dashboard)/canvas/page.tsx',
  'src/app/(dashboard)/canvas/new/page.tsx',
  'src/app/(dashboard)/canvas/[id]/page.tsx',
  'src/app/(dashboard)/canvas/recipes/page.tsx',
  'src/app/(dashboard)/canvas/recipes/[id]/page.tsx',
  'src/app/(dashboard)/forms/page.tsx',
  'src/app/(dashboard)/forms/FormsNav.tsx',
  'src/app/(dashboard)/forms/builder/page.tsx',
  'src/app/(dashboard)/forms/responses/page.tsx',
  'src/app/(dashboard)/reply/page.tsx',
  'src/app/(dashboard)/reply/ReplyNav.tsx',
  'src/app/(dashboard)/reply/auto/page.tsx',
  'src/app/(dashboard)/reply/crisis/page.tsx',
  'src/app/(dashboard)/reply/faq/page.tsx',
  'src/app/(dashboard)/rfp/page.tsx',
  'src/app/(dashboard)/rfp/RfpNav.tsx',
  'src/app/(dashboard)/rfp/active/page.tsx',
  'src/app/(dashboard)/rfp/closed/page.tsx',
  'src/app/(dashboard)/scheduler/page.tsx',
  'src/app/(dashboard)/scheduler/SchedulerNav.tsx',
  'src/app/(dashboard)/scheduler/appointments/page.tsx',
  'src/app/(dashboard)/scheduler/types/page.tsx',
  'src/app/(dashboard)/nps/page.tsx',
  'src/app/(dashboard)/listening/page.tsx',
  'src/app/(dashboard)/media-buying/page.tsx',
  'src/app/(dashboard)/media-relations/page.tsx',
  'src/app/(dashboard)/press-releases/page.tsx',
  'src/app/(dashboard)/crisis-comms/page.tsx',
  'src/app/(dashboard)/influencer-mgmt/page.tsx',
  'src/app/(dashboard)/events/page.tsx',
  'src/app/(dashboard)/client-portal/page.tsx',
  'src/app/(dashboard)/client-reporting/page.tsx',
  'src/app/(dashboard)/access-control/page.tsx',
  'src/app/(dashboard)/api-management/page.tsx',
  'src/app/(dashboard)/delegation/page.tsx',
  'src/app/(dashboard)/builder/page.tsx',
  'src/app/(dashboard)/spokechat/page.tsx',
];

const skipPatterns = [
  /^\s*(PLANNING|ACTIVE|ON_HOLD|COMPLETED|ARCHIVED|TODO|IN_PROGRESS|DONE|DRAFT|IN_REVIEW)\s*:/,
  /^\s*(WON|LOST|SUBMITTED|REVIEW|CONFIRMED|PENDING|CANCELLED)\s*:/,
  /^\s*(Active|Paused|Completed|Draft)\s*:/,
  /^\s*(critical|high|medium|low|confirmed|pending|declined)\s*:/,
  /^\s*(START|END|ACTION|CONDITION|DELAY|APPROVAL|NOTIFICATION)\s*:/,
  /^\s*(Product|Pricing|Support|General)\s*:/,
  /^\s*(Social|Finance|CRM)\s*:/,
  /^\s*(instagram|tiktok|linkedin|twitter|facebook)\s*:/,
  /STATUS_COLORS|BRIEF_STATUS_COLORS|URGENCY_COLORS|SEVERITY_COLORS|PLATFORM_COLORS|CATEGORY_COLORS|KANBAN_COLORS|RSVP_COLORS|TYPE_COLORS|NODE_TYPE_COLORS|PLATFORM_CONFIG/,
];

function shouldSkipLine(line) {
  return skipPatterns.some(p => p.test(line));
}

const replacements = [
  ['hover:bg-indigo-700', 'hover:bg-[var(--accent-hover)]'],
  ['hover:bg-indigo-100', 'hover:bg-[var(--accent-subtle)]'],
  ['hover:bg-gray-200', 'hover:bg-[var(--bg-hover)]'],
  ['hover:bg-gray-100', 'hover:bg-[var(--bg-hover)]'],
  ['hover:bg-gray-50', 'hover:bg-[var(--bg-hover)]'],
  ['hover:text-gray-800', 'hover:text-[var(--text-primary)]'],
  ['hover:text-gray-700', 'hover:text-[var(--text-secondary)]'],
  ['hover:text-gray-600', 'hover:text-[var(--text-secondary)]'],
  ['hover:border-gray-300', 'hover:border-[var(--border-strong)]'],
  ['focus:ring-indigo-500', 'focus:ring-[var(--accent)]'],
  ['focus:ring-indigo-300', 'focus:ring-[var(--accent)]'],
  ['divide-gray-200', 'divide-[var(--border)]'],
  ['divide-gray-100', 'divide-[var(--border)]'],
  ['border-indigo-600', 'border-[var(--accent)]'],
  ['border-indigo-300', 'border-[var(--accent)]'],
  ['border-indigo-200', 'border-[var(--accent)]'],
  ['border-gray-300', 'border-[var(--border-strong)]'],
  ['border-gray-200', 'border-[var(--border)]'],
  ['border-gray-100', 'border-[var(--border)]'],
  ['ring-indigo-100', 'ring-[var(--accent-subtle)]'],
  ['bg-indigo-700', 'bg-[var(--accent)]'],
  ['bg-indigo-600', 'bg-[var(--accent)]'],
  ['bg-indigo-500', 'bg-[var(--accent)]'],
  ['bg-indigo-400', 'bg-[var(--accent)]'],
  ['bg-indigo-100', 'bg-[var(--accent-subtle)]'],
  ['bg-indigo-50', 'bg-[var(--accent-subtle)]'],
  ['bg-gray-200', 'bg-[var(--bg-surface)]'],
  ['bg-gray-100', 'bg-[var(--bg-surface)]'],
  ['bg-gray-50', 'bg-[var(--bg-base)]'],
  ['text-indigo-800', 'text-[var(--accent)]'],
  ['text-indigo-700', 'text-[var(--accent)]'],
  ['text-indigo-600', 'text-[var(--accent)]'],
  ['text-indigo-500', 'text-[var(--accent)]'],
  ['text-gray-900', 'text-[var(--text-primary)]'],
  ['text-gray-800', 'text-[var(--text-primary)]'],
  ['text-gray-700', 'text-[var(--text-secondary)]'],
  ['text-gray-600', 'text-[var(--text-secondary)]'],
  ['text-gray-500', 'text-[var(--text-secondary)]'],
  ['text-gray-400', 'text-[var(--text-tertiary)]'],
  ['text-gray-300', 'text-[var(--text-tertiary)]'],
  ['placeholder-gray-400', 'placeholder-[var(--text-tertiary)]'],
];

let totalChanges = 0;

for (const f of files) {
  const fp = resolve(f);
  if (!existsSync(fp)) { console.log('SKIP: ' + f); continue; }
  let content = readFileSync(fp, 'utf8');
  let lines = content.split('\n');

  lines = lines.map(line => {
    if (shouldSkipLine(line)) return line;
    let modified = line;
    for (const [from, to] of replacements) {
      modified = modified.split(from).join(to);
    }
    // bg-white -> bg-[var(--bg-base)]  (word boundary safe)
    modified = modified.replace(/(?<![\\w-])bg-white(?![\\w-])/g, 'bg-[var(--bg-base)]');
    // text-white on accent bg lines -> text-[var(--primary-foreground)]
    if (modified.includes('bg-[var(--accent)]') && modified.includes('text-white')) {
      modified = modified.split('text-white').join('text-[var(--primary-foreground)]');
    }
    return modified;
  });

  const newContent = lines.join('\n');
  if (newContent !== content) {
    writeFileSync(fp, newContent);
    totalChanges++;
    console.log('DONE: ' + f);
  } else {
    console.log('NO CHANGES: ' + f);
  }
}
console.log('Total files changed: ' + totalChanges);
