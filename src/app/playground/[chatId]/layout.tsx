import React from 'react'
import StepNav from './_components/StepNav'

export default async function ChatStepLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ chatId: string }> }>) {
  const { chatId } = await params;
  return (
    <>
      <div className="px-6 max-w-4xl mx-auto">
        <StepNav chatId={chatId} />
      </div>
      {children}
    </>
  )
}


