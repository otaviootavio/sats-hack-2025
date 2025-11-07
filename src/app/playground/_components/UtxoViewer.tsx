import React from 'react';

type Vin = {
  txid: string;
  vout: number;
};

type Vout = {
  n: number;
  valueBtc: string | null;
  scriptPubKeyAddress?: string | null;
  scriptPubKeyType?: string | null;
};

type UtxoViewerProps = {
  vin: Vin[];
  vout: Vout[];
  highlightBtcString: string;
};

export function UtxoViewer({ vin, vout, highlightBtcString }: UtxoViewerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-sm font-medium">Inputs</div>
        <ul className="space-y-1 text-sm">
          {vin.map((vinItem, idx) => (
            <li key={`vin-${idx}`} className="rounded border bg-gray-50 px-2 py-1">
              <div className="break-all text-xs">{vinItem.txid}:{vinItem.vout}</div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium">Outputs</div>
        <ul className="space-y-1 text-sm">
          {vout.map((voutItem) => {
            const isHighlight = voutItem.valueBtc === highlightBtcString;
            const isFee = voutItem.scriptPubKeyType === "fee";
            const address = voutItem.scriptPubKeyAddress;
            return (
              <li
                key={`vout-${voutItem.n}`}
                className={`rounded border px-2 py-1 ${isHighlight ? "bg-yellow-100 border-yellow-500" : "bg-gray-50"}`}
              >
                <div className="break-all text-xs">{isFee ? "Transaction fees" : (address ?? "Confidential")}</div>
                <div className="text-xs text-gray-600">index: {voutItem.n}</div>
                <div className="text-xs text-gray-600">
                  {typeof voutItem.valueBtc === "string" ? `${voutItem.valueBtc} tLBTC` : "Confidential"}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
