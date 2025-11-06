'use client'
import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { api } from "~/trpc/react"

export default function ChatSidebar({ userName }: { userName?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const listQuery = api.chat.list.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (last) => last.nextCursor,
      refetchOnWindowFocus: false,
    },
  )

  const utils = api.useUtils()
  const createMutation = api.chat.create.useMutation({
    onSuccess: async (chat) => {
      await utils.chat.list.invalidate()
      router.push(`/playground/${chat.id}`)
    },
  })

  const items = listQuery.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="h-full flex flex-col border-r w-72">
      <div className="p-3 border-b flex items-center gap-2">
        <button
          onClick={() => createMutation.mutate({})}
          className="btn bg-sky-600 text-white px-3 py-1 rounded"
        >
          New chat
        </button>
        <div className="ml-auto relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="border px-3 py-1 rounded text-sm hover:bg-gray-50"
          >
            {`Hi ${userName ?? 'User'}!`}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow">
              <Link href="/api/auth/signout" className="block px-3 py-2 text-sm hover:bg-gray-50">Sign out</Link>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((c) => {
          const href = `/playground/${c.id}`
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={c.id}
              href={href}
              className={
                `block px-3 py-2 text-sm truncate ${active ? 'bg-sky-50 text-sky-900' : 'hover:bg-gray-50'}`
              }
            >
              {c.title || 'Untitled'}
            </Link>
          )
        })}
        {items.length === 0 && (
          <div className="p-3 text-sm text-gray-500">No chats yet.</div>
        )}
      </div>
      <div className="p-3 border-t">
        <button
          onClick={() => listQuery.fetchNextPage()}
          disabled={!listQuery.hasNextPage || listQuery.isFetchingNextPage}
          className="btn border px-3 py-1 rounded w-full disabled:opacity-50"
        >
          {listQuery.isFetchingNextPage ? 'Loading…' : listQuery.hasNextPage ? 'Load more' : 'No more'}
        </button>
      </div>
    </div>
  )
}


