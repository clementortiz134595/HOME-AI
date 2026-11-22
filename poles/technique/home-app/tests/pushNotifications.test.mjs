import test from 'node:test';
import assert from 'node:assert/strict';

import { pushErrorMessage } from '../src/lib/pushNotifications.ts';

test('explique une erreur Push exploitable sans révéler de donnée sensible', () => {
  assert.match(pushErrorMessage(new Error('push_not_available')), /écran d’accueil/i);
  assert.match(pushErrorMessage(new Error('push_subscription_unavailable')), /Home Core/i);
  assert.match(pushErrorMessage(new Error('unexpected')), /connexion/i);
});
