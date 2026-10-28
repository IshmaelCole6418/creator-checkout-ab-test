import { z } from "zod";
import { infrai } from "./infrai.ts";

export type CheckoutInput = {
  userId: string;
  flagKey: string;
  creatorId: string;
  assetId: string;
};

export type CheckoutDecision = {
  userId: string;
  creatorId: string;
  assetId: string;
  variant: string;
  delivery: "signed-download" | "subscriber-update";
};

const checkoutInput = z.object({
  userId: z.string().min(1),
  flagKey: z.string().min(1),
  creatorId: z.string().min(1),
  assetId: z.string().min(1)
});

export async function chooseCheckout(input: CheckoutInput): Promise<CheckoutDecision> {
  const valid = checkoutInput.parse(input);
  const user = await infrai.auth.user.get(valid.userId);
  const resolvedUserId = user.id ?? valid.userId;
  const assignment = await infrai.flags.get_value(valid.flagKey, resolvedUserId);
  const variant = assignment.variant ?? String(assignment.value ?? "control");
  return {
    userId: resolvedUserId,
    creatorId: valid.creatorId,
    assetId: valid.assetId,
    variant,
    delivery: variant === "subscriber-update" ? "subscriber-update" : "signed-download"
  };
}

if (process.argv[1]?.endsWith("checkout_ab_test.ts")) {
  const userId = process.env.CREATOR_USER_ID;
  const flagKey = process.env.CREATOR_FLAG_KEY;
  if (!userId || !flagKey) throw new Error("CREATOR_USER_ID and CREATOR_FLAG_KEY are required");
  const decision = await chooseCheckout({ userId, flagKey, creatorId: "creator-demo", assetId: "asset-demo" });
  console.log(JSON.stringify(decision, null, 2));
}
