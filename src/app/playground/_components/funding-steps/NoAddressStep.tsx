import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

type NoAddressStepProps = {
  chatId: string;
};

export function NoAddressStep({ chatId }: NoAddressStepProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Address Required</AlertTitle>
      <AlertDescription>
        <p>
          Before you can fund this channel, you need to create a code and
          generate an address first.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/playground/${chatId}/code`}>Go to Code Session</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

