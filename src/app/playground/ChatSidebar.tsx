"use client";
import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export default function ChatSidebar({ userName, userImage }: { userName?: string; userImage?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const listQuery = api.chat.list.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (last) => last.nextCursor,
      refetchOnWindowFocus: false,
    },
  );

  const utils = api.useUtils();
  const createMutation = api.chat.create.useMutation({
    onSuccess: async (chat) => {
      await utils.chat.list.invalidate();
      router.push(`/playground/${chat.id}`);
    },
  });

  const items = listQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex h-screen w-72 flex-col border-r">
      <div className="flex flex-col justify-start gap-2 p-3 mb-5">
        <div>
          <button
            onClick={() => createMutation.mutate({})}
            className="btn rounded bg-sky-600 px-3 py-1 text-white"
          >
            New chat
          </button>
        </div>
        <div>
          <Link
            href="/playground/ai-agent"
            className="btn rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Try using our AI
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {items.map((c) => {
          const href = `/playground/${c.id}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={c.id}
              href={href}
              className={`block truncate px-3 py-2 text-sm ${active ? "bg-sky-100 text-sky-900" : "hover:bg-gray-200"}`}
            >
              {c.title || "Untitled"}
            </Link>
          );
        })}
        {items.length === 0 && (
          <div className="p-3 text-sm text-gray-500">No chats yet.</div>
        )}
      </div>
      <div className="border-t p-3">
        <button
          onClick={() => listQuery.fetchNextPage()}
          disabled={!listQuery.hasNextPage || listQuery.isFetchingNextPage}
          className="btn w-full rounded border px-3 py-1 disabled:opacity-50"
        >
          {listQuery.isFetchingNextPage
            ? "Loading…"
            : listQuery.hasNextPage
              ? "Load more"
              : "No more"}
        </button>
      </div>
      <div className="border-t p-3">
        <div className="relative">
          {menuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-gray-200 bg-white shadow-lg">
              <Link
                href="/api/auth/signout"
                className="block rounded-lg px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Sign out
              </Link>
            </div>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 overflow-hidden">
              {userImage ? (
                <img src={userImage} alt={userName ?? "User"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-gray-600">
                  {(userName ?? "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="truncate text-sm font-medium text-gray-700">
              {userName ?? "User"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
