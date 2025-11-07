"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function ChatSidebar({
  userName,
  userImage,
}: {
  userName?: string;
  userImage?: string;
}) {
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
      <div className="mb-5 flex flex-col justify-start gap-2 p-3">
        <div>
          <Button onClick={() => createMutation.mutate({})} size="sm">
            New chat
          </Button>
        </div>
        <div>
          <Button
            asChild
            size="sm"
            className="group relative max-w-full overflow-hidden border-0 bg-linear-to-r from-purple-600 via-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-[1.02] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent"
          >
            <Link href="/playground/ai-agent" className="relative z-10">
              ✨ Try using our AI
            </Link>
          </Button>
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
              className={cn(
                "block truncate rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              {c.title || "Untitled"}
            </Link>
          );
        })}
        {items.length === 0 && (
          <div className="p-3 text-sm text-gray-500">No chats yet.</div>
        )}
      </div>
      {listQuery.hasNextPage && (
        <div className="border-t p-3">
          <Button
            onClick={() => listQuery.fetchNextPage()}
            disabled={!listQuery.hasNextPage || listQuery.isFetchingNextPage}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {listQuery.isFetchingNextPage
              ? "Loading…"
              : listQuery.hasNextPage
                ? "Load more"
                : ""}
          </Button>
        </div>
      )}
      <div className="border-t p-3">
        <div className="relative">
          {menuOpen && (
            <div className="absolute right-0 bottom-full left-0 mb-1 rounded-lg border border-gray-200 bg-white shadow-lg">
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName ?? "User"}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
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
