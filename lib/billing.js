import { createLongplayServer } from '@tinkerlandai/longplay-sdk/server';
import { fbGet } from './meta.js';

export class BillingError extends Error {
  constructor(code, message, status) { super(message); this.code = code; this.status = status; }
}

// Optional hosted pilot: bill an authorized ad account, not a browser-supplied Customer ID.
export async function requireCampaignAccess({ fbToken, adAccount }, env = process.env,
  services = { readAccount: fbGet, createClient: createLongplayServer }) {
  if (!env.LONGPLAY_CAMPAIGN_FEATURE_ID) return;
  if (!/^act_\d+$/.test(adAccount) || typeof fbToken !== 'string' || !fbToken) {
    throw new BillingError('account_required', 'Informe uma conta de anúncios e token válidos.', 400);
  }
  // Prove Meta access before looking up billing. Never transmit the Meta/Anthropic keys to Longplay.
  try {
    const account = await services.readAccount(fbToken, `${adAccount}?fields=id`, AbortSignal.timeout(5000));
    if (account.id !== adAccount) throw new Error('Account mismatch');
  } catch {
    throw new BillingError('account_forbidden', 'Não foi possível confirmar acesso à conta de anúncios.', 403);
  }
  let allowed;
  try {
    if (!env.LONGPLAY_BASE_URL || !env.LONGPLAY_APP_ID || !env.LONGPLAY_SECRET_KEY ||
      !['sandbox', 'live'].includes(env.LONGPLAY_ENVIRONMENT)) throw new Error('Billing configuration missing');
    const client = services.createClient({ baseUrl: env.LONGPLAY_BASE_URL, apiKey: env.LONGPLAY_SECRET_KEY,
      scope: { projectId: env.LONGPLAY_APP_ID, environment: env.LONGPLAY_ENVIRONMENT }, timeoutMs: 5000 });
    const { customer } = await client.getOrCreateCustomer({ externalUserId: `sobetudo:adaccount:${adAccount}` });
    const { check } = await client.checkEntitlement({ customerId: customer.id,
      requirement: { internal_feature_id: env.LONGPLAY_CAMPAIGN_FEATURE_ID, quantity: '1', properties: {} } });
    if (check.kind !== 'access') throw new Error('An access Feature is required');
    allowed = check.allowed;
  } catch {
    throw new BillingError('billing_unavailable', 'Não foi possível verificar o plano. Tente novamente.', 503);
  }
  if (!allowed) throw new BillingError('plan_required', 'Esta conta precisa de um plano com criação de campanhas.', 402);
}
