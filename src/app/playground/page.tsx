import { redirect } from 'next/navigation'
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function Page() {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const userId = session.user.id;

  const userExists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) {
    return redirect(`/login?callbackUrl=${encodeURIComponent("/playground")}`);
  }

  const active = await api.chat.getActive();
  if (active?.id) return redirect(`/playground/${active.id}`);

  const newest = await api.chat.list({ limit: 1 });
  if (newest.items[0]?.id) return redirect(`/playground/${newest.items[0].id}`);

  const created = await api.chat.create({});
  return redirect(`/playground/${created.id}`);
}


