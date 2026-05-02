'use client'

import { useLocale } from '@/lib/locale'

export default function NotificationsPage() {
  const { t } = useLocale()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{t.notifications.title}</h2>
        <p className="text-sm text-gray-400">{t.notifications.subtitle}</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        <p className="font-semibold mb-2">{t.notifications.channelsTitle}</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Email (SMTP)</li>
          <li>SMS (AdaSMS, SMS Niaga)</li>
          <li>WhatsApp Rasmi (WABA)</li>
          <li>WhatsApp Tidak Rasmi</li>
          <li>Webhook</li>
        </ul>
        <p className="mt-3 text-xs">{t.notifications.configNote} <code>POST /api/v1/notification/config</code></p>
      </div>
    </div>
  )
}
