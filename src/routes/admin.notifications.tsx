import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Field, MediaField, Messages, PageTitle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { BellIcon, CheckIcon, MailIcon } from '~/components/icons'
import {
  getNotifyOverview,
  previewCampaign,
  removePushDevice,
  resumeCampaign,
  savePushDevice,
  sendCampaignTest,
  sendTestEmail,
  startCampaign,
  stopCampaign,
  testPush,
  type CampaignInput,
} from '~/fns/notify'
import { deviceLabel, pushState, subscribePush, unsubscribePush, type PushState } from '~/lib/push-client'

export const Route = createFileRoute('/admin/notifications')({
  loader: () => getNotifyOverview(),
  component: NotificationsAdmin,
})

type Data = Awaited<ReturnType<typeof getNotifyOverview>>

function NotificationsAdmin() {
  const data = Route.useLoaderData()
  return (
    <>
      <PageTitle title="Alerts & emails">
        Get a notification on your phone the moment an order, booking or chat comes in, email your customers about their orders, and send festive
        emails to your customer list.
      </PageTitle>
      <div className="grid gap-6 xl:grid-cols-2">
        <PhoneAlerts data={data} />
        <EmailSetup data={data} />
      </div>
      {data.owner && <Festive data={data} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Phone alerts
// ---------------------------------------------------------------------------
function PhoneAlerts({ data }: { data: Data }) {
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [state, setState] = useState<PushState | 'checking'>('checking')

  async function check() {
    try {
      const r = await pushState()
      setState(r.state)
    } catch {
      setState('unsupported')
    }
  }
  useEffect(() => {
    check()
  }, [])

  async function turnOn() {
    const ok = await run(async () => {
      const sub = await subscribePush(data.publicKey)
      await savePushDevice({ data: { ...sub, label: deviceLabel() } })
    }, 'Alerts are on for this device. A test notification is on its way.')
    await check()
    if (ok) router.invalidate()
  }
  async function turnOff() {
    const ok = await run(async () => {
      const ep = await unsubscribePush()
      if (ep) await removePushDevice({ data: { endpoint: ep } })
    }, 'Alerts are off for this device.')
    await check()
    if (ok) router.invalidate()
  }

  return (
    <section className="admin-card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-brand">
          <BellIcon />
        </span>
        <div>
          <h2 className="text-lg font-bold">Phone alerts</h2>
          <p className="text-sm text-[#667085]">A notification for every new order, payment, booking, quote request and chat, even when the dashboard is closed.</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#f6f7fb] p-4 text-sm">
        {state === 'checking' && <p>Checking this device…</p>}
        {state === 'on' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-semibold text-emerald-700">
              <CheckIcon /> Alerts are on for this device
            </p>
            <button type="button" className="font-semibold text-[#667085] hover:text-red-700" disabled={busy} onClick={turnOff}>
              Turn off
            </button>
          </div>
        )}
        {state === 'off' && (
          <div className="space-y-3">
            <p>Alerts are off on this device.</p>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={turnOn}>
              {busy ? 'Turning on…' : 'Turn on alerts on this phone'}
            </button>
          </div>
        )}
        {state === 'needs-install' && (
          <div className="space-y-2">
            <p className="font-semibold">On iPhone, add the dashboard to your Home Screen first:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>In Safari, tap the Share button (the square with an arrow).</li>
              <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
              <li>Open <strong>Miel Admin</strong> from your Home Screen, sign in, and come back to this page.</li>
            </ol>
            <p className="text-xs text-[#667085]">Apple only allows website alerts this way (iOS 16.4 or newer).</p>
          </div>
        )}
        {state === 'blocked' && (
          <p>
            Notifications are blocked for this website. Open your browser&rsquo;s site settings, allow notifications for {typeof window !== 'undefined' ? window.location.host : 'this site'}, then reload this page.
          </p>
        )}
        {state === 'unsupported' && <p>This browser can&rsquo;t show website notifications. Try Chrome on Android or a computer, or Safari from the Home Screen on iPhone.</p>}
      </div>

      {data.devices.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="admin-label !mb-0">Devices getting alerts ({data.devices.length})</p>
            <button
              type="button"
              className="text-sm font-semibold text-brand hover:underline"
              disabled={busy}
              onClick={() => run(async () => {
                const r = await testPush()
                return r
              }, 'Test alert sent. It should arrive in a few seconds.')}
            >
              Send a test alert
            </button>
          </div>
          <ul className="divide-y divide-[#eceff5] rounded-xl ring-1 ring-[#e3e7f0]">
            {data.devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  {d.label}
                  <span className="block text-xs text-[#98a2b3]">Since {formatDate(d.created_at)}</span>
                </span>
                <button
                  type="button"
                  className="text-[#98a2b3] hover:text-red-700"
                  onClick={async () => {
                    if (await run(() => removePushDevice({ data: { id: d.id } }), 'Device removed.')) router.invalidate()
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!data.email.pushOn && (
        <p className="text-sm font-semibold text-amber-800">
          Phone alerts are switched off in <Link to="/admin/settings" className="underline">Settings → Alerts &amp; emails</Link>.
        </p>
      )}
      <Messages error={error} notice={notice} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Email setup
// ---------------------------------------------------------------------------
function EmailSetup({ data }: { data: Data }) {
  const { busy, error, notice, run } = useAction()
  const e = data.email
  return (
    <section className="admin-card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-brand">
          <MailIcon />
        </span>
        <div>
          <h2 className="text-lg font-bold">Email</h2>
          <p className="text-sm text-[#667085]">Alerts to your inbox, and order updates to customers (order received, payment confirmed, ready, out for delivery, quote ready…).</p>
        </div>
      </div>

      {e.connected ? (
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-emerald-700">
            <CheckIcon /> Email is connected
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-[#667085]">Alerts go to</dt>
            <dd className="font-semibold">{e.alertEmail || 'Not set'}</dd>
            <dt className="text-[#667085]">Emails come from</dt>
            <dd className="font-semibold">{e.from}</dd>
            <dt className="text-[#667085]">Sent today</dt>
            <dd className="font-semibold tabular">
              {e.sentToday} of {e.dailyLimit}
            </dd>
            <dt className="text-[#667085]">Order alerts</dt>
            <dd>{e.alertsOn ? 'On' : 'Off'}</dd>
            <dt className="text-[#667085]">Customer emails</dt>
            <dd>{e.customerOn ? 'On' : 'Off'}</dd>
          </dl>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" className="btn btn-ghost !py-2 text-sm" disabled={busy} onClick={() => run(async () => sendTestEmail(), 'Test email sent. Check your inbox (and spam folder).')}>
              Send me a test email
            </button>
            <Link to="/admin/settings" className="btn btn-ghost !py-2 text-sm">
              Change email settings
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-amber-800">Email isn&rsquo;t connected yet. It takes about 15 minutes, once:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Create a free account at <a href="https://resend.com/signup" target="_blank" rel="noopener" className="font-semibold text-brand underline">resend.com</a> (100 emails a day free).
            </li>
            <li>
              In Resend, go to <strong>Domains → Add domain</strong>, type <strong>mielcakes.com</strong>, and choose <strong>Sign in to Cloudflare</strong> so it adds the DNS
              records for you (or copy them into Cloudflare → DNS). Wait until it says <strong>Verified</strong>.
            </li>
            <li>
              In Resend, go to <strong>API Keys → Create API key</strong> (Sending access) and copy it.
            </li>
            <li>
              On your computer, in the miel-cakes folder, run <code className="rounded bg-[#f2f4f7] px-1.5 py-0.5">npx wrangler secret put RESEND_API_KEY</code> and paste the key.
            </li>
            <li>
              Put the email that should get order alerts in <Link to="/admin/settings" className="font-semibold text-brand underline">Settings → Alerts &amp; emails</Link>, then
              come back here and send a test email.
            </li>
          </ol>
        </div>
      )}
      <Messages error={error} notice={notice} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Festive emails
// ---------------------------------------------------------------------------
const blankCampaign = (): CampaignInput => ({ subject: '', heading: '', body: 'Hi {name},\n\n', image_url: '', button_label: 'Order now', button_url: '/menu' })

function Festive({ data }: { data: Data }) {
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [form, setForm] = useState<CampaignInput>(blankCampaign)
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const set = <K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const e = data.email
  const perDay = Math.max(1, e.campaignPerDay)
  const days = Math.max(1, Math.ceil(Math.max(0, data.audience - e.allowanceToday) / perDay) + (e.allowanceToday > 0 ? 1 : 0))

  async function send() {
    const r = await run(async () => startCampaign({ data: form }))
    setConfirming(false)
    if (r) {
      setForm(blankCampaign())
      setPreview(null)
      router.invalidate()
    }
  }

  return (
    <section className="admin-card mt-6 space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Festive emails</h2>
          <p className="text-sm text-[#667085]">
            Christmas, Easter, Valentine&rsquo;s, Eid, new menu items… Goes to every customer with an email address on the{' '}
            <Link to="/admin/customers" className="font-semibold text-brand underline">Customers</Link> page who hasn&rsquo;t unsubscribed. Upload your list there.
          </p>
        </div>
        <p className="rounded-full bg-[#eef2ff] px-3 py-1 text-sm font-semibold text-brand tabular">{data.audience} customers with email</p>
      </div>

      {!e.connected && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">Connect email first (see the steps above).</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Subject line" htmlFor="c-subject" help="What people see in their inbox. {name} becomes their first name.">
            <input id="c-subject" className="admin-input" value={form.subject} onChange={(ev) => set('subject', ev.target.value)} placeholder="Christmas cakes are here, {name}!" />
          </Field>
          <Field label="Heading (optional)" htmlFor="c-heading">
            <input id="c-heading" className="admin-input" value={form.heading} onChange={(ev) => set('heading', ev.target.value)} placeholder="Merry Christmas from Miel Cakes" />
          </Field>
          <Field label="Message" htmlFor="c-body" help="Leave an empty line between paragraphs.">
            <textarea id="c-body" rows={8} className="admin-input" value={form.body} onChange={(ev) => set('body', ev.target.value)} />
          </Field>
          <Field label="Picture (optional)" htmlFor="c-image">
            <MediaField id="c-image" value={form.image_url} onChange={(v) => set('image_url', v)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text (optional)" htmlFor="c-btn">
              <input id="c-btn" className="admin-input" value={form.button_label} onChange={(ev) => set('button_label', ev.target.value)} />
            </Field>
            <Field label="Button opens" htmlFor="c-url" help="A page on your site like /menu, or a full link.">
              <input id="c-url" className="admin-input" value={form.button_url} onChange={(ev) => set('button_url', ev.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={async () => {
              const r = await run(() => previewCampaign({ data: form }))
              if (r) setPreview(r)
            }}>
              Preview
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy || !e.connected} onClick={() => run(async () => {
              const r = await sendCampaignTest({ data: form })
              return r
            }, 'Test sent to your alert email.')}>
              Send me a test
            </button>
            {confirming ? (
              <span className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fff7ed] px-3 py-2 text-sm">
                Send to {data.audience} customers?
                <button type="button" className="btn btn-primary !py-1.5 text-sm" disabled={busy} onClick={send}>
                  {busy ? 'Starting…' : 'Yes, send'}
                </button>
                <button type="button" className="font-semibold text-[#667085]" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-primary" disabled={busy || !e.connected || !data.audience || !form.subject.trim() || !form.body.trim()} onClick={() => setConfirming(true)}>
                Send to {data.audience} customers
              </button>
            )}
          </div>
          {data.audience > 0 && (
            <p className="text-xs text-[#667085]">
              To stay inside the free email allowance, up to {perDay} go out per day (each morning at about 9am). {e.allowanceToday} can go today.
              {data.audience > e.allowanceToday ? ` Everyone will have it in about ${days} day${days === 1 ? '' : 's'}, so send festive emails a few days early.` : ''}
            </p>
          )}
          <Messages error={error} notice={notice} />
        </div>
        <div>
          {preview ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-[#e3e7f0]">
              <p className="border-b border-[#e3e7f0] bg-[#f6f7fb] px-4 py-2 text-sm">
                <span className="text-[#667085]">Subject:</span> <strong>{preview.subject}</strong>
              </p>
              <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[640px] w-full bg-white" />
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[#d0d5e2] p-6 text-center text-sm text-[#667085]">
              Tap Preview to see how your email will look.
            </div>
          )}
        </div>
      </div>

      {data.campaigns.length > 0 && (
        <div>
          <h3 className="mb-3 font-bold">Sent and sending</h3>
          <ul className="space-y-3">
            {data.campaigns.map((c) => {
              const pct = c.total ? Math.round((c.sent / c.total) * 100) : 0
              return (
                <li key={c.id} className="rounded-xl p-4 ring-1 ring-[#e3e7f0]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.subject}</p>
                    <span className="text-xs text-[#667085]">{formatDate(c.created_at)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef1f7]">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="tabular text-[#475467]">
                      {c.sent} of {c.total} sent
                      {c.status === 'done' ? ' · finished' : c.status === 'stopped' ? ' · stopped' : ' · sending daily'}
                    </span>
                    {c.status === 'sending' && (
                      <button type="button" className="font-semibold text-[#667085] hover:text-red-700" disabled={busy} onClick={async () => (await run(() => stopCampaign({ data: c.id }), 'Stopped. No more of this email will go out.')) && router.invalidate()}>
                        Stop sending
                      </button>
                    )}
                    {c.status === 'stopped' && c.sent < c.total && (
                      <button type="button" className="font-semibold text-brand hover:underline" disabled={busy} onClick={async () => (await run(() => resumeCampaign({ data: c.id }), 'Sending again.')) && router.invalidate()}>
                        Carry on sending
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
