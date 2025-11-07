import { auth } from "~/server/auth";
import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user) return redirect("/");

  const { chatId } = await params;
  return redirect(`/playground/${chatId}/code`);
}


