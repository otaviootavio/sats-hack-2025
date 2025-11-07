"use client";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { NoAddressStep } from "./funding-steps/NoAddressStep";
import { ReadyToFundStep } from "./funding-steps/ReadyToFundStep";
import { FundingInProgressStep } from "./funding-steps/FundingInProgressStep";
import { FundingCompleteStep } from "./funding-steps/FundingCompleteStep";

type SelectedUtxo = {
  txid: string;
  voutIndex: number;
  valueSats: number;
} | null;

type FundingVin = { txid: string; vout: number };
type FundingVout = {
  n: number;
  valueSats: number | null;
  valueBtc: string | null;
};
type FundingSelected = {
  voutIndex: number;
  valueSats: number | null;
  nonceHex: string | null;
};
type FundingTxOk = {
  ok: true;
  txid: string;
  vin: FundingVin[];
  vout: FundingVout[];
  fundingTxId: string | null;
  selected: FundingSelected | null;
};
type FundingTxErr = { ok: false; error?: string };
type FundingTxResponse = FundingTxOk | FundingTxErr;

type FundingStatus =
  | 'NO_ADDRESS'
  | 'READY_TO_FUND'
  | 'AWAITING_TXID'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'FAILED';

const isFundingStatus = (s: unknown): s is FundingStatus =>
  typeof s === 'string' && (
    s === 'NO_ADDRESS' ||
    s === 'READY_TO_FUND' ||
    s === 'AWAITING_TXID' ||
    s === 'AWAITING_CONFIRMATION' ||
    s === 'COMPLETED' ||
    s === 'FAILED'
  );

export default function FundingClient({ chatId }: { chatId: string }) {
  const [statusMessage, setStatusMessage] = useState("");
  const highlightBtcString = useMemo(() => "0.00100000", []);

  // tRPC hooks
  const utils = api.useUtils();
  const { data: chatData } = api.chat.get.useQuery(
    { chatId },
    { refetchOnWindowFocus: false },
  );
  const { mutate: setActiveMutate } = api.chat.setActive.useMutation();
  
  const fundingStatus: FundingStatus | undefined = isFundingStatus(chatData?.fundingStatus)
    ? chatData?.fundingStatus
    : undefined;
  const { mutateAsync: initiateFundingMutate, isPending: isInitiating } =
    api.chat.initiateFunding.useMutation({
      onSuccess: async (data) => {
        await utils.chat.get.invalidate({ chatId });
        await utils.chat.list.invalidate();
        if (data && 'fundingTxId' in data && data.fundingTxId) {
          await utils.chat.getFundingTx.invalidate({ chatId });
        }
      },
    });
  const { mutateAsync: requestFundingMutate, isPending: isFunding } =
    api.chat.requestFunding.useMutation({
      onSuccess: async (data) => {
        await utils.chat.get.invalidate({ chatId });
        await utils.chat.list.invalidate();
        // If we got a funding TX ID, trigger a fetch of the transaction details
        if (data && 'fundingTxId' in data && data.fundingTxId) {
          await utils.chat.getFundingTx.invalidate({ chatId });
        }
      },
    });
  const fundingTxQuery = api.chat.getFundingTx.useQuery(
    { chatId },
    { 
      enabled: !!chatData?.fundingTxId, 
      refetchOnWindowFocus: false,
      retry: false, // Don't retry failed requests automatically
      refetchInterval: fundingStatus === 'AWAITING_CONFIRMATION' ? 10000 : false,
    },
  );
  const { mutateAsync: refetchFundingTxMutate, isPending: isRefetching } =
    api.chat.refetchFundingTx.useMutation({
      onSuccess: async () => {
        // Invalidate and refetch the funding tx query
        await utils.chat.getFundingTx.invalidate({ chatId });
        await utils.chat.getFundingTx.refetch({ chatId });
      },
    });

  const fundingTxDataOk: FundingTxOk | null = fundingTxQuery.data?.ok
    ? (fundingTxQuery.data as FundingTxOk)
    : null;

  // mark active
  useEffect(() => {
    if (!chatId) return;
    setActiveMutate({ chatId });
  }, [chatId, setActiveMutate]);

  // Get address from chat data
  const address = chatData?.address ?? "";
  const fundedUrl = chatData?.faucetUrl ?? "";
  const fundingTxId = chatData?.fundingTxId ?? "";


  // Derive selected UTXO from server data
  const selectedUtxo: SelectedUtxo = useMemo(() => {
    if (!fundingTxId || !fundingTxQuery.data?.ok) return null;
    const data = fundingTxQuery.data as FundingTxOk;
    const selected = data.selected;
    if (selected && typeof selected.voutIndex === 'number') {
      const sats =
        typeof selected.valueSats === 'number'
          ? selected.valueSats
          : Math.round(parseFloat(highlightBtcString) * 1e8);
      return { txid: fundingTxId, voutIndex: selected.voutIndex, valueSats: sats };
    }
    return null;
  }, [fundingTxQuery.data, fundingTxId, highlightBtcString]);

  const handleFundAddress = async () => {
    if (!address) return;
    setStatusMessage("Requesting funding from faucet...");
    try {
      const res = await initiateFundingMutate({ chatId });
      const tx = (res as { fundingTxId?: string } | undefined)?.fundingTxId;
      if (tx) {
        setStatusMessage(`Funding requested. Transaction: ${tx}. You can open details below.`);
      } else {
        setStatusMessage("Funding requested. Waiting for transaction id from faucet...");
      }
    } catch {
      setStatusMessage("Failed to initiate funding. Please try again later.");
    }
  };

  const handleRetryFetchFunding = async () => {
    if (!fundedUrl && !address) return;
    try {
      setStatusMessage("Retrying to fetch funding transaction id from faucet...");
      const res = await requestFundingMutate({ chatId });
      const tx = (res as { fundingTxId?: string } | undefined)?.fundingTxId;
      if (tx) {
        setStatusMessage(`Success: funding transaction id ${tx}.`);
      } else {
        setStatusMessage("We could not fetch the funding transaction. Please try again later.");
      }
    } catch {
      setStatusMessage("We could not fetch the funding transaction. Please try again later.");
    }
  };

  const handleRefetchFundingTx = async () => {
    if (!fundingTxId) return;
    try {
      setStatusMessage("Refreshing transaction details from Blockstream...");
      const res = await refetchFundingTxMutate({
        chatId,
      }) as unknown as FundingTxResponse;
      if (res.ok && 'selected' in res && res.selected) {
        setStatusMessage("Transaction confirmed! UTXO selected and saved.");
      } else if (res.ok) {
        setStatusMessage("Transaction details refreshed.");
      } else {
        setStatusMessage("Failed to refresh transaction details. The transaction may not be confirmed yet.");
      }
    } catch {
      setStatusMessage("Failed to refresh transaction details. The transaction may not be confirmed yet.");
    }
  };

  // Determine which step to show
  const renderStep = () => {
    // Explicit status machine
    if (fundingStatus === 'NO_ADDRESS' || !address) {
      return <NoAddressStep chatId={chatId} />;
    }

    if (fundingStatus === 'COMPLETED' && selectedUtxo && fundingTxId) {
      return (
        <FundingCompleteStep
          address={address}
          fundingTxId={fundingTxId}
          selectedUtxo={selectedUtxo}
          fundingTxData={fundingTxDataOk}
          fundedUrl={fundedUrl}
          highlightBtcString={highlightBtcString}
          isRefetching={isRefetching}
          onRefetchFundingTx={handleRefetchFundingTx}
        />
      );
    }

    if (fundingStatus === 'AWAITING_TXID' || fundingStatus === 'AWAITING_CONFIRMATION') {
      return (
        <FundingInProgressStep
          address={address}
          fundedUrl={fundedUrl}
          fundingTxId={fundingTxId}
          selectedUtxo={selectedUtxo}
          isFunding={isFunding || isInitiating}
          isRefetching={isRefetching}
          fundingTxData={fundingTxDataOk}
          highlightBtcString={highlightBtcString}
          fundingStatus={fundingStatus}
          onRetryFetchFunding={handleRetryFetchFunding}
          onRefetchFundingTx={handleRefetchFundingTx}
        />
      );
    }

    // READY_TO_FUND (default)
    return <ReadyToFundStep address={address} onFundAddress={handleFundAddress} />;
  };

  return (
    <div className="space-y-4">
      {renderStep()}

      {statusMessage && (
        <div className="rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap">
          {statusMessage}
        </div>
      )}

    </div>
  );
}
