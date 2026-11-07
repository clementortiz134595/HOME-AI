import test from 'node:test';
import assert from 'node:assert/strict';
import { canReadResults, parseAssistantAnswer, responseKind } from '../src/lib/assistant.ts';

test('une confirmation ou un refus ne déclenche jamais une lecture de source', () => {
  for (const status of ['refused', 'unavailable', 'failed', 'confirmation_required']) {
    assert.equal(canReadResults({ text: 'Retour serveur', status, gmailQuery: 'from:person' }), false);
  }
  assert.equal(canReadResults({ text: 'Autorisation nécessaire', confirmationId: 'opaque-token', status: 'executed' }), false);
  assert.equal(canReadResults({ text: 'Résultat validé', status: 'executed', gmailQuery: 'from:person' }), true);
});

test('les anciens contrats texte restent acceptés et les métadonnées sont filtrées', () => {
  assert.deepEqual(parseAssistantAnswer({ text: 'Réponse existante' }), { text: 'Réponse existante' });
  assert.deepEqual(parseAssistantAnswer({ text: 'Résultat', gmailQuery: { query: 'invalid' }, confirmationId: '', toolCalls: ['untrusted'] }), { text: 'Résultat' });
  assert.throws(() => parseAssistantAnswer({ text: 'Résultat', status: 'not-a-known-status' }));
  assert.throws(() => parseAssistantAnswer({ answer: 'missing text' }));
});

test('la requête Gmail serveur choisit la carte sans être dérivée de la transcription', () => {
  assert.equal(responseKind('Ouvre le dernier message', { text: 'Résultat', gmailQuery: 'from:person' }), 'mail');
  assert.equal(responseKind('Quels trains après la bourse ?'), 'markets');
  assert.equal(responseKind('Comment évolue PANX ?'), 'markets');
  assert.equal(responseKind('Qui est Marie Curie ?'), 'biography');
  assert.equal(responseKind('Pourquoi le ciel est bleu ?'), 'general');
});
