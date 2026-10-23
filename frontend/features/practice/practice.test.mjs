import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

async function load(name) {
  const source = fs.readFileSync(new URL(name, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
}
const { recordAttempt, summarize } = await load('./session.ts');
const { practiceService } = await load('./service.ts');
test('Wrong cards repeat until known, without changing first-answer success', () => {
  let queue = ['a', 'b'];
  const attempts = [];
  for (const correct of [false, true, true]) {
    attempts.push({ id: queue[0], correct });
    queue = recordAttempt(queue, correct);
  }
  assert.deepEqual(queue, []);
  assert.deepEqual(summarize(attempts), { correct: 1, wrong: 1, rate: 50, repeats: 1 });
});
test('Single wrong card stays available and empty sessions have zero success', () => {
  assert.deepEqual(recordAttempt(['a'], false), ['a']);
  assert.deepEqual(summarize([]), { correct: 0, wrong: 0, rate: 0, repeats: 0 });
});
test('Demo provider returns independent decks and supports cancellation', async () => {
  const cards = await practiceService.loadCards();
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length);
  cards.pop();
  assert.equal((await practiceService.loadCards()).length, cards.length + 1);
  const controller = new AbortController();
  assert.match(await practiceService.reply([{ role: 'user', content: 'Şiir nedir?' }], controller.signal), /Örnek yanıt/);
  controller.abort();
  await assert.rejects(practiceService.reply([], controller.signal), { name: 'AbortError' });
});
