import { createFileRoute } from '@tanstack/react-router'
import { SettingsEditor } from '~/components/admin/SettingsEditor'
import { PageTitle } from '~/components/admin/ui'
import { getAdminSettings } from '~/fns/admin'

export const Route = createFileRoute('/admin/content')({
  loader: () => getAdminSettings(),
  component: ContentPage,
})

function ContentPage() {
  const settings = Route.useLoaderData()
  return (
    <>
      <PageTitle title="Website content">
        Edit the words, photos and videos on the homepage and About page. Save each section when you&rsquo;re done.
      </PageTitle>
      <SettingsEditor groupIds={['hero', 'home', 'about', 'footer']} initial={settings} />
    </>
  )
}
