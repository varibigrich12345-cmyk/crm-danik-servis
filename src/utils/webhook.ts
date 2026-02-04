import type { Claim } from '@/types/database'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL

/**
 * Отправляет уведомление о новой заявке через webhook (n8n -> Telegram)
 */
export async function sendNewClaimWebhook(claim: Partial<Claim> & { number: string }): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.warn('VITE_WEBHOOK_URL не настроен, webhook не отправлен')
    return false
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'new_claim',
        claim: {
          number: claim.number,
          client_fio: claim.client_fio,
          client_company: claim.client_company,
          phone: claim.phone,
          car_brand: claim.car_brand,
          car_number: claim.car_number,
          status: claim.status,
          created_at: claim.created_at || new Date().toISOString(),
        },
      }),
    })

    if (!response.ok) {
      console.error('Webhook ошибка:', response.status, response.statusText)
      return false
    }

    console.log('Webhook отправлен успешно')
    return true
  } catch (error) {
    console.error('Ошибка отправки webhook:', error)
    return false
  }
}
