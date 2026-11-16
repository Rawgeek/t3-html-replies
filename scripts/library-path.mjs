import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
export const library=[process.env.T3_UI_LIBRARY,resolve(here,'../ui-library'),join(homedir(),'.codex/templates/t3-ui-library')]
  .filter(Boolean).find(path=>existsSync(join(path,'render-reply.mjs')));
if(!library)throw Error('UI library not found. Set T3_UI_LIBRARY.');
