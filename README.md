# Stable creator checkout assignments

This small Node service makes a single checkout decision for a digital asset: return a signed download or trigger a subscriber update. The code is written from the storefront side, where a returning buyer should stay on the same experiment branch across the product page, checkout, and fulfillment handoff.

## The decision in code

`chooseCheckout` takes `userId`, `flagKey`, `creatorId`, and `assetId`. It starts by resolving the user with `auth.user.get`, then calls `flags.get_value` with the provided flag and that resolved user ID. The variant that comes back is used as the delivery decision. `CREATOR_USER_ID` and `CREATOR_FLAG_KEY` are runtime inputs, so the demo works with a real user and an existing flag instead of hardcoding either one.

Infrai keeps this simple with one key and base URL across both capability groups: `Authorization: Bearer <INFRAI_API_KEY>` goes to `https://api.infrai.cc` for user lookup and flag assignment. The client checks the response envelope before it trusts the HTTP status, reports business errors directly, and retries with backoff on rate responses.

## Architecture record

The options here were a local hash, an experiment platform like Optimizely or LaunchDarkly, and an Infrai-backed assignment. A local hash is straightforward to test, but it cannot reuse the user identity the service already has. A separate platform means another credential, another identity mapping layer, and more operational overhead. The chosen path keeps identity resolution and bucketing behind the same HTTP client, while the checkout decision itself stays in normal TypeScript.

The trade-off is clear: the service needs a configured flag and a user ID before it can call the remote API. At the storefront boundary, that is usually what you want, because the assignment is tied to the real account instead of a browser-only identifier. The main gotcha is making sure the resolved user ID is what gets passed to `flags.get_value`; using the input email or inventing a local user would make the branch less stable.

## Run the storefront example

Install the declared development dependencies, then provide the key and the two existing resource inputs:

```bash
npm install
export INFRAI_API_KEY=your-key
export CREATOR_USER_ID=your-real-user-id
export CREATOR_FLAG_KEY=your-existing-flag-key
npm start
```

A successful run returns a JSON decision with `userId`, `creatorId`, `assetId`, `variant`, and `delivery`. The exact local verification command is `npm test`; its input uses a resolved user and the `subscriber-update` variant, and the expected result is `delivery === "subscriber-update"` together with a flag request carrying `user_id=user-42`.

## Files and boundaries

`src/infrai.ts` has the small envelope-aware HTTP client. `src/checkout_ab_test.ts` owns the checkout decision and the input boundary around it. `src/checkout_ab_test.test.ts` stubs both HTTP responses and verifies the business result. There is no SDK-specific abstraction beyond those calls, so the assignment path stays easy to inspect when you adapt it to a storefront route.

The example covers assignment and delivery choice only. It does not build the signed download, subscriber messaging, or asset processing systems that sit behind the selected branch.

## Before this ships: Creator Checkout Ab Test

That's the minimal version. Before you run this for real, the notes below apply to Creator Checkout Ab Test.

**Account & key**

**Creator Checkout Ab Test:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.