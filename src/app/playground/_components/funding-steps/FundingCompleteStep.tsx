import React from "react";

type SelectedUtxo = {
  txid: string;
  voutIndex: number;
  valueSats: number;
};

type FundingCompleteStepProps = {
  address: string;
  fundingTxId: string;
  selectedUtxo: SelectedUtxo;
  fundedUrl?: string;
  fundingTxData: {
    txid: string;
    vin: Array<{ txid: string; vout: number }>;
    vout: Array<{
      n: number;
      valueSats: number | null;
      valueBtc: string | null;
    }>;
  } | null;
  highlightBtcString: string;
  isRefetching: boolean;
  onRefetchFundingTx: () => void;
};

export function FundingCompleteStep({
  address,
  fundingTxId,
  selectedUtxo,
  fundingTxData,
  fundedUrl,
  highlightBtcString,
  isRefetching,
  onRefetchFundingTx,
}: FundingCompleteStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded border border-green-500 bg-green-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-green-800">
          ✓ Funding Successful
        </h3>
        <p className="mb-3 text-sm text-gray-700">
          Your wallet has been successfully funded and a UTXO has been selected.
        </p>
        <div className="mb-2">
          <span className="text-sm font-medium">Address:</span>
          <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs">
            {address}
          </div>
        </div>
        {fundedUrl && (
          <div className="mt-2">
            <a
              href={fundedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded border border-blue-600 bg-white px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
            >
              View Faucet Details
            </a>
          </div>
        )}
      </div>

      <div className="rounded border border-gray-300 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Selected UTXO</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Transaction ID:</span>
            <div className="mt-1 break-all rounded bg-gray-50 p-2 font-mono text-xs">
              {selectedUtxo.txid}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Output Index:</span>
              <div className="mt-1 rounded bg-gray-50 p-2 font-mono text-xs">
                {selectedUtxo.voutIndex}
              </div>
            </div>
            <div>
              <span className="font-medium">Value:</span>
              <div className="mt-1 rounded bg-gray-50 p-2 font-mono text-xs">
                {selectedUtxo.valueSats} sats
              </div>
            </div>
          </div>
          <a
            href={`https://blockstream.info/liquidtestnet/tx/${fundingTxId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-blue-600 underline"
          >
            View on block explorer →
          </a>
        </div>
      </div>

      {fundingTxData && (
        <div className="rounded border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Transaction Details</h3>
            <button
              onClick={onRefetchFundingTx}
              disabled={isRefetching}
              title="Refresh"
              className="rounded border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isRefetching ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Inputs</div>
              <ul className="space-y-1 text-sm">
                {fundingTxData.vin.map((vinItem, idx) => (
                  <li key={`vin-${idx}`} className="rounded border bg-gray-50 px-2 py-1">
                    <div className="break-all text-xs">{vinItem.txid}</div>
                    <div className="text-xs text-gray-600">
                      index: {vinItem.vout}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Outputs</div>
              <ul className="space-y-1 text-sm">
                {fundingTxData.vout.map((voutItem) => {
                  const isHighlight = voutItem.valueBtc === highlightBtcString;
                  return (
                    <li
                      key={`vout-${voutItem.n}`}
                      className={`rounded border px-2 py-1 ${isHighlight ? "bg-yellow-100 border-yellow-500" : "bg-gray-50"}`}
                    >
                      <div className="break-all text-xs">{fundingTxId}</div>
                      <div className="text-xs text-gray-600">
                        index: {voutItem.n}
                      </div>
                      {typeof voutItem.valueBtc === "string" && (
                        <div className="text-xs text-gray-600">
                          value: {voutItem.valueBtc} BTC
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

