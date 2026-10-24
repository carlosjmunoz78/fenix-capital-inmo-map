from pathlib import Path
p=Path('src/CerebroBrowserConsole.tsx')
s=p.read_text()
old="import {parseBrowserCommand} from './cerebroBrowserCommand';"
new="import {parseBrowserCommand} from '../cerebro/runtime/browser-command-parser-v3';"
if old not in s: raise SystemExit('PARSER_IMPORT_ANCHOR_MISSING')
p.write_text(s.replace(old,new,1))
print('BROWSER_PARSER_RELOCATED')
