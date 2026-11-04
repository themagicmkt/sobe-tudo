import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BillingError, requireCampaignAccess } from '../lib/billing.js';
import { createCampaignHandler } from '../api/create-campaign.js';

const env = { LONGPLAY_CAMPAIGN_FEATURE_ID: '11111111-1111-4111-8111-111111111111', LONGPLAY_BASE_URL: 'https://billing.example', LONGPLAY_APP_ID: 'app', LONGPLAY_SECRET_KEY: 'server-only', LONGPLAY_ENVIRONMENT: 'sandbox' };
const input = { fbToken: 'example-meta-token', adAccount: 'act_123' };
function services({ allowed = true, kind = 'access', account = 'act_123', failure } = {}) {
  const calls = [];
  return { calls, readAccount: async (...args) => { calls.push(['meta', ...args.slice(0, 2)]); return { id: account }; },
    createClient: (options) => { calls.push(['config', options]); return {
      getOrCreateCustomer: async (request) => { calls.push(['customer', request]); return { customer: { id: 'customer' } }; },
      checkEntitlement: async (request) => { calls.push(['check', request]); if (failure) throw new Error(failure); return { check: { allowed, kind } }; },
    }; } };
}
test('unconfigured local/BYOK installations make no billing or Meta preflight calls', async () => {
  const s = services(); await requireCampaignAccess(input, {}, s); assert.deepEqual(s.calls, []);
});
test('Meta authorization precedes workspace billing and no provider key is transmitted', async () => {
  const s = services(); await requireCampaignAccess(input, env, s);
  assert.equal(s.calls[0][0], 'meta');
  assert.deepEqual(s.calls[2], ['customer', { externalUserId: 'sobetudo:adaccount:act_123' }]);
  assert.deepEqual(s.calls[3], ['check', { customerId: 'customer', requirement: { internal_feature_id: env.LONGPLAY_CAMPAIGN_FEATURE_ID, quantity: '1', properties: {} } }]);
});
test('a forged/unreadable ad account never reaches billing', async () => {
  const s = services({ account: 'act_456' });
  await assert.rejects(requireCampaignAccess(input, env, s), { code: 'account_forbidden', status: 403 });
  assert.equal(s.calls.length, 1);
});
test('expired/revoked access returns payment-required; credit checks cannot act as a spend reservation', async () => {
  await assert.rejects(requireCampaignAccess(input, env, services({ allowed: false })), { code: 'plan_required', status: 402 });
  await assert.rejects(requireCampaignAccess(input, env, services({ kind: 'credit' })), { code: 'billing_unavailable', status: 503 });
});
test('service errors are sanitized and every invocation gets a fresh check', async () => {
  const s = services(); await requireCampaignAccess(input, env, s); await requireCampaignAccess(input, env, s);
  assert.equal(s.calls.filter(([name]) => name === 'check').length, 2);
  await assert.rejects(requireCampaignAccess(input, env, services({ failure: 'secret-provider-response' })), (e) => e.status === 503 && !e.message.includes('secret-provider-response'));
});
test('the actual campaign handler returns 402 before any provider mutation', async () => {
  const network = mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected network'); });
  const handler = createCampaignHandler(async () => { throw new BillingError('plan_required', 'upgrade', 402); });
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await handler({ method: 'POST', headers: { 'x-app-pass': process.env.APP_PASSWORD || '' }, body: input }, res);
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.code, 'plan_required');
    assert.equal(network.mock.callCount(), 0);
  } finally { network.mock.restore(); }
});
