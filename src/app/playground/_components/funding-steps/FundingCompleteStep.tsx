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
      scriptPubKeyAddress?: string | null;
      scriptPubKeyType?: string | null;
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
      <Card className="border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">✓ Funding Successful</CardTitle>
          <CardDescription className="text-gray-700">
            Your wallet has been funded and a UTXO was selected for this chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Address</span>
            <div className="mt-1 break-all rounded bg-white p-2 font-mono text-xs">
              {address}
            </div>
          </div>
        </CardContent>
        {fundedUrl && (
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <a
                href={fundedUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Faucet Details
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected UTXO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <span className="font-medium">Transaction ID</span>
            <div className="mt-1 break-all rounded bg-gray-50 p-2 font-mono text-xs">
              {fundingTxData?.txid ?? selectedUtxo.txid}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="font-medium">Output Index</span>
              <div className="mt-1 rounded bg-gray-50 p-2 font-mono text-xs">
                {selectedUtxo.voutIndex}
              </div>
            </div>
            <div>
              <span className="font-medium">Value</span>
              <div className="mt-1 rounded bg-gray-50 p-2 font-mono text-xs">
                {selectedUtxo.valueSats} sats
              </div>
            </div>
          </div>
          <a
            href={`https://blockstream.info/liquidtestnet/tx/${fundingTxData?.txid ?? fundingTxId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-blue-600 underline"
          >
            View on block explorer →
          </a>
        </CardContent>
      </Card>

      {fundingTxData && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              Inspect the inputs and outputs for the faucet transaction.
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
          <CardContent>
            <UtxoViewer
              vin={fundingTxData.vin}
              vout={fundingTxData.vout}
              highlightBtcString={highlightBtcString}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

