import test from 'node:test';
import assert from 'node:assert/strict';
import { getSystemMetrics } from '../src/lib/systemHealth.ts';

test('lit les métriques Raspberry Pi sans les mettre en cache', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ hostname: 'pi', memory: {}, disk: {}, network: {} }), { status: 200 });
  };
  try {
    const metrics = await getSystemMetrics();
    assert.equal(request.url, '/v1/system/metrics');
    assert.equal(request.options.cache, 'no-store');
    assert.equal(metrics.hostname, 'pi');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('signale une réponse système non disponible', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });
  try {
    await assert.rejects(getSystemMetrics(), { message: 'system_metrics_unavailable' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
