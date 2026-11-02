import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-serif text-2xl">This page could not be found.</p>
      <p className="mt-3 text-ink-2">
        &ldquo;Seek and you will find.&rdquo; Try the{' '}
        <Link href="/read/" className="text-accent underline">
          book list
        </Link>{' '}
        or{' '}
        <Link href="/search/" className="text-accent underline">
          search
        </Link>
        .
      </p>
    </div>
  )
}
