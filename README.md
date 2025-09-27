To install dependencies:

```sh
bun install
```

To run:

```sh
bun run dev
```

open http://localhost:3000

## Testing proposals (requires localnet network running)

To run localnet test with sui, it's required that Sui runs in the background (localnet).

To accomplish that, you can run:

```
sui client switch --env localnet
sui start --force-regenesis --with-faucet
```
