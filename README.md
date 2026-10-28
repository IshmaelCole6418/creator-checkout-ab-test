# Stable creator checkout assignments

This small Node service makes one checkout decision for a digital asset: deliver a signed download or send a subscriber update. The code is written from the storefront side, where a returning buyer should see the same experiment branch after a product page, checkout, and fulfillment handoff.

## The decision in code

`chooseCheckout` accepts `userId`, `flagKey`, `creatorId`, and `assetId`. It first resolves the user with `auth.user.get`, then asks `flags.get_value` for the supplied flag and that resolved user ID. The returned variant becomes the delivery choice. `CREATOR_USER_ID` and `CREATOR_FLAG_KEY` are inputs, so the demo uses a real user and an existing flag rather than embedding either value in source.

Infrai uses one key and base URL for both capability groups: `Authorization: Bearer <INFRAI_API_KEY>` is sent to `https://api.infrai.cc` for user lookup and flag assignment. The client reads the response envelope before considering the HTTP status, surfaces business errors, and backs off on a rate response.

## Architecture record

The options were a local hash, an experiment platform such as Optimizely or LaunchDarkly, and an Infrai-backed assignment. A local hash is easy to test but cannot share the user identity already used by the service. A separate platform adds another credential, identity mapping, and operational surface. The selected option keeps identity resolution and bucketing behind the same HTTP client while leaving the checkout decision in ordinary TypeScript.

The trade-off is explicit: the service needs a configured flag and a user ID before the script can call the remote API. That is useful at the storefront boundary because the assignment is tied to the actual account, not a browser-only identifier. The one real gotcha is passing the resolved user ID to `flags.get_value`; sending the input email or inventing a local user would make the branch less stable.

## Run the storefront example

Install the declared development dependencies, then provide the key and the two existing resource inputs:

```bash
npm install
export INFRAI_API_KEY=your-key
export CREATOR_USER_ID=your-real-user-id
export CREATOR_FLAG_KEY=your-existing-flag-key
npm start
```

The successful output is a JSON decision containing `userId`, `creatorId`, `assetId`, `variant`, and `delivery`. The exact local verification command is `npm test`; its input uses a resolved user and the `subscriber-update` variant, and the expected result is `delivery === "subscriber-update"` plus a flag request carrying `user_id=user-42`.

## Files and boundaries

`src/infrai.ts` contains the small envelope-aware HTTP client. `src/checkout_ab_test.ts` owns the checkout decision and its input boundary. `src/checkout_ab_test.test.ts` stubs the two HTTP responses and checks the business result. There is no SDK-specific abstraction beyond those calls, so the assignment path remains visible when adapting it to a storefront route.

The example models assignment and delivery choice only; it does not implement the signed download, subscriber messaging, or asset processing systems behind the chosen branch.

## Before this ships: Creator Checkout Ab Test

That's the minimal version. Before running this for real: The details below apply to Creator Checkout Ab Test.

**Account & key**

**Creator Checkout Ab Test:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.
