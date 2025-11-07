import React from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { UtxoViewer } from "../UtxoViewer";

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
      scriptPubKeyAddress?: string | null;
      scriptPubKeyType?: string | null;
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
  const statusExplanation =
    fundingStatus === 'AWAITING_TXID'
      ? 'Waiting for the faucet to return a transaction id. This may take a moment.'
      : fundingStatus === 'AWAITING_CONFIRMATION'
        ? 'Transaction broadcasted. Waiting for confirmation and UTXO selection.'
        : "Your wallet is being funded. This process may take a few moments.";

  return (
    <div className="space-y-4">
      <Card className="border-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle>Address Funding in Progress</CardTitle>
          <CardDescription>{statusExplanation}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm font-medium">Address</span>
            <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs">
              {address}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={fundedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Faucet Details
              </a>
            </Button>

            <Button asChild variant="outline" size="sm">
              <a
                href={`https://blockstream.info/liquidtestnet/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Address on Explorer
              </a>
            </Button>

            {fundingTxId && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://blockstream.info/liquidtestnet/tx/${fundingTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View TX on Explorer
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!fundingTxId && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle>Waiting for Funding Transaction</CardTitle>
            <CardDescription>
              Waiting for the faucet to return the funding transaction id.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={onRetryFetchFunding}
              disabled={isFunding}
              variant="outline"
              size="sm"
            >
              {isFunding ? "Retrying..." : "↻ Retry Fetch"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {fundingTxId && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Confirmation</CardTitle>
            <CardDescription>
              Monitor the faucet transaction and selected UTXO for this session.
            </CardDescription>
            <CardAction>
              <Button
                onClick={onRefetchFundingTx}
                disabled={isRefetching}
                title="Refresh"
                variant="outline"
                size="sm"
              >
                {isRefetching ? "Refreshing..." : "↻ Refresh"}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="font-medium">Transaction ID</span>
              <div className="mt-1 break-all rounded bg-gray-50 p-2 font-mono text-xs">
                {fundingTxData?.txid ?? fundingTxId}
              </div>
              {!selectedUtxo && (
                <div className="mt-2 rounded border border-yellow-200 bg-yellow-50 p-2 text-gray-700">
                  After the transaction is confirmed on the network we will fetch
                  the full UTXO details and select the output for this channel.
                </div>
              )}
              <a
                href={`https://blockstream.info/liquidtestnet/tx/${fundingTxData?.txid ?? fundingTxId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-blue-600 underline"
              >
                Check confirmation status on block explorer →
              </a>
            </div>

            {fundingTxData && (
              <UtxoViewer
                vin={fundingTxData.vin}
                vout={fundingTxData.vout}
                highlightBtcString={highlightBtcString}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

