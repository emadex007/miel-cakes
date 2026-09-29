import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow text-brand">Page not found</p>
      <h1 className="mt-3 font-display text-4xl">This one didn&rsquo;t come out of the oven.</h1>
      <p className="mt-4 text-muted">The page may have moved, or the product may no longer be on the menu.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/menu" className="btn btn-primary">See the menu</Link>
        <Link to="/" className="btn btn-ghost">Go home</Link>
      </div>
    </div>
  )
}
