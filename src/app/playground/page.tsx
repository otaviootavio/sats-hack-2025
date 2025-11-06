import React from 'react'
import PlaygroundClient from './PlaygroundClient'
import { HydrateClient, api } from "~/trpc/server";
import { auth } from "~/server/auth";

export default async function Page() {
  const session = await auth();
  if (session?.user) {
    void api.preset.getSelected.prefetch();
  }
  return (
    <HydrateClient>
      <main className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">SimplicityHL Playground</h1>
        <PlaygroundClient />
      </main>
    </HydrateClient>
  )
}


