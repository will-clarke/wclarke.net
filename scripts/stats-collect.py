#!/usr/bin/env python3
"""Aggregate Will's commits across ~/code/wclarke-gems (github+srht mirrors deduped by SHA)."""
import subprocess, os, json, glob, re
from collections import defaultdict

EMAILS = {
    'wmmclarke@gmail.com', 'will.clarke@justeattakeaway.com', 'will.clarke@infosum.com',
    'william.clarke@blacklane.com', 'william.clarke@williamclark-lp.trafficbroker.local',
    'will-clarke@users.noreply.github.com', 'wmmc@users.noreply.github.com',
    'wmmc@macbook-pro.lan', 'wmmc@MacBook-Pro.local', 'wmmc@Williams-MacBook-Pro.local',
    'wmmc@williams-mbp.lan', '$EMAIL',
}
SKIP = re.compile(r'(^|/)(node_modules|vendor|_site|dst|\.bundle|bower_components|tmp)/'
                  r'|package-lock\.json$|yarn\.lock$|Gemfile\.lock$|mix\.lock$|flake\.lock$|Cargo\.lock$|poetry\.lock$'
                  r'|\.min\.(js|css)$|\.(pdf|db|sqlite3?|psd|eps)$')

EXT_LANG = {
    'rb': 'Ruby', 'erb': 'Ruby', 'rake': 'Ruby', 'gemspec': 'Ruby',
    'js': 'JavaScript', 'coffee': 'JavaScript', 'ts': 'JavaScript', 'jsx': 'JavaScript', 'mjs': 'JavaScript', 'astro': 'JavaScript',
    'go': 'Go', 'py': 'Python', 'rs': 'Rust', 'zig': 'Zig', 'ex': 'Elixir', 'exs': 'Elixir', 'heex': 'Elixir',
    'hs': 'Haskell', 'elm': 'Elm', 'el': 'Emacs Lisp', 'c': 'C', 'h': 'C', 'lua': 'Lua',
    'md': 'Markdown/prose', 'org': 'Markdown/prose', 'txt': 'Markdown/prose',
    'html': 'HTML/CSS', 'css': 'HTML/CSS', 'scss': 'HTML/CSS',
    'sh': 'Shell/config', 'fish': 'Shell/config', 'bash': 'Shell/config', 'nix': 'Shell/config',
    'yml': 'Shell/config', 'yaml': 'Shell/config', 'toml': 'Shell/config', 'json': 'Shell/config',
    'vim': 'Shell/config', 'conf': 'Shell/config', 'sql': 'Shell/config',
}

seen = set()
per_year = defaultdict(lambda: {'commits': 0, 'add': 0, 'del': 0, 'repos': set()})
per_lang = defaultdict(int)
per_repo = defaultdict(int)
first = last = None

roots = sorted(glob.glob(os.path.expanduser('~/code/wclarke-gems/*/*')))
for repo in roots:
    if not os.path.isdir(os.path.join(repo, '.git')):
        continue
    name = os.path.basename(repo)
    if name in ('voron-backup', 'klipper-backup'):  # automated backup mirrors, not authored code
        continue
    try:
        out = subprocess.run(
            ['git', '-C', repo, 'log', '--all', '--no-merges',
             '--format=@%H|%ae|%ad', '--date=format:%Y-%m-%d', '--numstat'],
            capture_output=True, text=True, timeout=300).stdout
    except Exception as e:
        print('ERR', repo, e); continue
    cur = None
    for line in out.splitlines():
        if line.startswith('@'):
            sha, email, date = line[1:].split('|')
            if email not in EMAILS or sha in seen:
                cur = None
                continue
            seen.add(sha)
            cur = date[:4]
            per_year[cur]['commits'] += 1
            per_year[cur]['repos'].add(name)
            per_repo[name] += 1
            first = min(first or date, date); last = max(last or date, date)
        elif cur and line.strip():
            parts = line.split('\t')
            if len(parts) != 3 or parts[0] == '-':
                continue
            a, d, path = parts
            if SKIP.search(path):
                continue
            a, d = int(a), int(d)
            per_year[cur]['add'] += a
            per_year[cur]['del'] += d
            ext = path.rsplit('.', 1)[-1].lower() if '.' in os.path.basename(path) else ''
            per_lang[EXT_LANG.get(ext, 'Other')] += a

years = {y: {'commits': v['commits'], 'add': v['add'], 'del': v['del'],
             'repos': sorted(v['repos'])} for y, v in sorted(per_year.items())}
print(json.dumps({
    'first': first, 'last': last, 'total_commits': len(seen),
    'total_add': sum(v['add'] for v in per_year.values()),
    'total_del': sum(v['del'] for v in per_year.values()),
    'years': years,
    'languages': dict(sorted(per_lang.items(), key=lambda kv: -kv[1])),
    'top_repos': dict(sorted(per_repo.items(), key=lambda kv: -kv[1])[:15]),
}, indent=1))
