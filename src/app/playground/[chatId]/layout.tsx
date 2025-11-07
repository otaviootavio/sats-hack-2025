import React from 'react'
import StepNav from './_components/StepNav'
import { api } from '~/trpc/server';

export default async function ChatStepLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ chatId: string }> }>) {
  const { chatId } = await params;
  // Set the active chat on the server for immediate feedback on page load
  void api.chat.setActive({ chatId });
  return (
    <>
      <StepNav chatId={chatId} />
      <div className="pt-3">
        {children}
      </div>
    </>
  )
}


