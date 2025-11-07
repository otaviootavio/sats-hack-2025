import React from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type ReadyToFundStepProps = {
  address: string;
  onFundAddress: () => void;
};

export function ReadyToFundStep({
  address,
  onFundAddress,
}: ReadyToFundStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Your Channel</CardTitle>
        <CardDescription>
          Review the generated address and request faucet funding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Step 1: Your Address</h3>
          <textarea
            value={address}
            readOnly
            rows={2}
            className="w-full rounded border bg-gray-50 p-2 font-mono text-sm"
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Step 2: Fund Your Channel</h3>
          <p className="text-sm text-gray-700">
            Click the button below to request funding from the Liquid testnet
            faucet.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onFundAddress}>Fund the address</Button>
      </CardFooter>
    </Card>
  );
}

