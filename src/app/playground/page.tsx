import { redirect } from 'next/navigation'
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";

export default async function Page() {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const active = await api.chat.getActive();
  const newest = await api.chat.list({ limit: 1 });
  const created = await api.chat.create({});

  if (active?.id) return redirect(`/playground/${active.id}`);

  if (newest.items[0]?.id) return redirect(`/playground/${newest.items[0].id}`);

  return redirect(`/playground/${created.id}`);
}


