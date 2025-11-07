import React from "react";

type NoAddressStepProps = {
  chatId: string;
};

export function NoAddressStep({ chatId }: NoAddressStepProps) {
  return (
    <div className="rounded border border-yellow-500 bg-yellow-50 p-4">
      <h3 className="mb-2 text-sm font-semibold">Address Required</h3>
      <p className="mb-3 text-sm text-gray-700">
        Before you can fund this channel, you need to create a code and generate
        an address first.
      </p>
      <a
        href={`/playground/${chatId}/code`}
        className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Go to Code Session
      </a>
    </div>
  );
}

