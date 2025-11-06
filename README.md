# Satas Hack 2024 Docs


# Satshack Docks

# Old docs

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.


## TODOs


#### Issues on http://localhost:3000/playground/cmhn3j92g0005vq36sof74509/funding

1. first issue on the frontend
We could not fetch the funding transaction. Please try again later.
--> this may happen because the txs still being mined or confirmed, or any other rate limit issue

2. second issue on the backend now
[TRPC] chat.fetchTx took 479ms to execute
❌ tRPC failed on chat.fetchTx: fetch failed
 GET /api/trpc/chat.fetchTx?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22txid%22%3A%2293417c6d64b9c0f339c501d30d4520382fc04ca153e05a8d13e03ac7d6194bfc%22%7D%7D%7D 200 in 743ms
prisma:query SELECT "public"."Session"."id", "public"."Session"."sessionToken", "public"."Session"."userId", "public"."Session"."expires" FROM "public"."Session" WHERE ("public"."Session"."sessionToken" = $1 AND 1=1) LIMIT $2 OFFSET $3
prisma:query SELECT "public"."User"."id", "public"."User"."name", "public"."User"."email", "public"."User"."emailVerified", "public"."User"."image", "public"."User"."selectedPreset", "public"."User"."selectedChatId" FROM "public"."User" WHERE "public"."User"."id" IN ($1) OFFSET $2
[TRPC] chat.fetchTx took 755ms to execute
❌ tRPC failed on chat.fetchTx: fetch failed
 GET /api/trpc/chat.fetchTx?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22txid%22%3A%2293417c6d64b9c0f339c501d30d4520382fc04ca153e05a8d13e03ac7d6194bfc%22%7D%7D%7D 200 in 1038ms
prisma:query SELECT "public"."Session"."id", "public"."Session"."sessionToken", "public"."Session"."userId", "public"."Session"."expires" FROM "public"."Session" WHERE ("public"."Session"."sessionToken" = $1 AND 1=1) LIMIT $2 OFFSET $3
prisma:query SELECT "public"."User"."id", "public"."User"."name", "public"."User"."email", "public"."User"."emailVerified", "public"."User"."image", "public"."User"."selectedPreset", "public"."User"."selectedChatId" FROM "public"."User" WHERE "public"."User"."id" IN ($1) OFFSET $2
[TRPC] chat.fetchTx took 670ms to execute
 GET /api/trpc/chat.fetchTx?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22txid%22%3A%2293417c6d64b9c0f339c501d30d4520382fc04ca153e05a8d13e03ac7d6194bfc%22%7D%7D%7D 200 in 971ms


this may be related with the time that the tx may be processing. So lets add this new feature ( say that the funding may fail )

WASM loaded. Generate the address, then fund it. --> this appears when the address has already been funded. Makes no sense, remove it!


#### Step 2

finally, client playground has also other feature called

Wallet (per chat, server-backed)
and
UTXO (manual)

This two features can be separated into a new step, This new step will be in the address
playground/{chatid}/sign

this page will have two main components
1.  the wallet component, where the user can see the Wallet ( the user can generate it and it is persisted on the backend, as it implemented currently )

@PlaygroundClient.tsx 

2. The sign Button that will sign the utxo 

note: we can show the utxo data for the user (txid, vout, value (sats)) in a cart ( annotation card )

note 2: notice that the code now has a lot of automation that gather all the informations of the utxo, hence it is ready to sign! so we wanna keep all thos features. 

note 3: we are not currently persiting the necessary data ( nonce + utxo id ) from the previous step, This is why need to modify the fetchTx in order to 1. get just once ( if is has been suceeded ) and store this on the database. Hence the sign step will only get from the database, with no need to get again from the blockchain. In order to allow "fail safe" approach, we need to add a "refetch button" make the fetch request again to blockstream