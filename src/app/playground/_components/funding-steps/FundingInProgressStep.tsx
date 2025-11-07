import React from "react";

type FundingInProgressStepProps = {
  address: string;
  fundedUrl: string;
  fundingTxId: string | null;
  selectedUtxo?: { txid: string; voutIndex: number; valueSats: number } | null;
  isFunding: boolean;
  isRefetching: boolean;
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
  fundingStatus?:
    | 'NO_ADDRESS'
    | 'READY_TO_FUND'
    | 'AWAITING_TXID'
    | 'AWAITING_CONFIRMATION'
    | 'COMPLETED'
    | 'FAILED';
  onRetryFetchFunding: () => void;
  onRefetchFundingTx: () => void;
};

export function FundingInProgressStep({
  address,
  fundedUrl,
  fundingTxId,
  selectedUtxo,
  isFunding,
  isRefetching,
  fundingTxData,
  highlightBtcString,
  fundingStatus,
  onRetryFetchFunding,
  onRefetchFundingTx,
}: FundingInProgressStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded border border-blue-500 bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold">Wallet Funding in Progress</h3>
        <p className="mb-3 text-sm text-gray-700">
          {fundingStatus === 'AWAITING_TXID' && 'Waiting for the faucet to return a transaction id. This may take a moment.'}
          {fundingStatus === 'AWAITING_CONFIRMATION' && 'Transaction broadcasted. Waiting for confirmation and UTXO selection.'}
          {!fundingStatus && 'Your wallet is being funded. This process may take a few moments.'}
        </p>
        <div className="mb-2">
          <span className="text-sm font-medium">Address:</span>
          <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs">
            {address}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={fundedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-blue-600 bg-white px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
          >
            View Faucet Details
          </a>

          {/* Always allow checking the address on the block explorer while waiting */}
          <a
            href={`https://blockstream.info/liquidtestnet/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            View Address on Explorer
          </a>

          {fundingTxId && (
            <a
              href={`https://blockstream.info/liquidtestnet/tx/${fundingTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              View TX on Explorer
            </a>
          )}
        </div>
      </div>

      {!fundingTxId && (
        <div className="rounded border border-yellow-500 bg-yellow-50 p-4">
          <p className="mb-2 text-sm text-gray-700">
            Waiting for funding transaction ID from the faucet...
          </p>
          <button
            onClick={onRetryFetchFunding}
            disabled={isFunding}
            className="rounded border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {isFunding ? "Retrying..." : "↻ Retry Fetch"}
          </button>
        </div>
      )}

      {fundingTxId && (
        <div className="rounded border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Transaction Confirmation</h3>
            <button
              onClick={onRefetchFundingTx}
              disabled={isRefetching}
              title="Refresh"
              className="rounded border border-gray-400 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {isRefetching ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
          <div className="mb-3 text-sm">
            <span className="font-medium">Transaction ID:</span>
            <div className="mt-1 break-all rounded bg-gray-50 p-2 font-mono text-xs">
              {fundingTxId}
            </div>
            {/* If we have a txid but no selected UTXO yet, explain that we're waiting for confirmation */}
            {!selectedUtxo && (
              <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-gray-700">
                After the transaction is confirmed on the network we will fetch
                the full UTXO details and select the output for this channel.
              </div>
            )}
            <a
              href={`https://blockstream.info/liquidtestnet/tx/${fundingTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-blue-600 underline"
            >
              Check confirmation status on block explorer →
            </a>
          </div>

          {fundingTxData && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          )}
        </div>
      )}
    </div>
  );
}

