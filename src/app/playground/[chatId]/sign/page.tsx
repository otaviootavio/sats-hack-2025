import React from 'react'
import SignClient from '~/app/playground/_components/SignClient'
import { HydrateClient, api } from "~/trpc/server";
import { auth } from "~/server/auth";
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const { chatId } = await params;
  const chat = await api.chat.get({ chatId });
  if (!chat) return redirect("/playground");

  void api.chat.get.prefetch({ chatId });
  void api.chat.list.prefetchInfinite({});

  return (
    <HydrateClient>
      <main className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Sign</h1>
        <SignClient chatId={chatId} />
      </main>
    </HydrateClient>
  )
}


