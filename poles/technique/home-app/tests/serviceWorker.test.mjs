import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('le service worker gère Push et ouvre la vue rappels sans contenu sensible', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /addEventListener\("notificationclick"/);
  assert.match(worker, /\?view=reminders/);
  assert.match(worker, /Un rappel est arrivé à échéance/);
});
