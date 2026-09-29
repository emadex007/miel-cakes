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
      <PageTitle title="Settings">Business details, brand colours, contact information and payment details.</PageTitle>
      <SettingsEditor groupIds={['brand', 'contact', 'ordering']} initial={settings} />
    </>
  )
}
