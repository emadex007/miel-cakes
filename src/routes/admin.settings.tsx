import { createFileRoute } from '@tanstack/react-router'
import { SettingsEditor } from '~/components/admin/SettingsEditor'
import { PageTitle } from '~/components/admin/ui'
import { getAdminSettings } from '~/fns/admin'

export const Route = createFileRoute('/admin/settings')({
  loader: () => getAdminSettings(),
  component: SettingsPage,
})

function SettingsPage() {
  const settings = Route.useLoaderData()
  return (
    <>
      <PageTitle title="Settings & colours">Business name, logo, brand and button hover colours, contact details, payment and delivery information, and receipt wording.</PageTitle>
      <SettingsEditor groupIds={['brand', 'contact', 'ordering', 'notifications', 'chat', 'receipt', 'sharing']} initial={settings} />
    </>
  )
}
