import React from "react";

type ReadyToFundStepProps = {
  address: string;
  onFundAddress: () => void;
};

export function ReadyToFundStep({
  address,
  onFundAddress,
}: ReadyToFundStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Step 1: Your Address</h3>
        <textarea
          value={address}
          readOnly
          rows={2}
          className="w-full rounded border p-2 font-mono text-sm bg-gray-50"
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">Step 2: Fund Your Channel</h3>
        <p className="mb-3 text-sm text-gray-700">
          Click the button below to request funding from the Liquid testnet faucet.
        </p>
        <button
          onClick={onFundAddress}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Fund the Wallet
        </button>
      </div>
    </div>
  );
}

