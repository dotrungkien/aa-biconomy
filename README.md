# Biconomy V2 hands-on

Original article: [https://kiendt.me/posts/2023-06-09-thuc-hanh-biconomy/](https://kiendt.me/posts/2023-06-09-thuc-hanh-biconomy/)

## Preparation

- in `.env`

```js
PRIVATE_KEY=
PAYMASTER_URL=
```

note that private key just act as the smart wallet owner only, it will not be used directly in anywhere.

about paymaster, go to [Biconomy Dashboad](https://dashboard.biconomy.io/paymasters/d8c5dbc6-513e-421d-ab64-a28fcf8c5206) and create a new one.

## Tested scenarios

- Send ETH
- Send tokens
- Paymaster: Send tokens, paymaster pay fee in ETH
- Paymaster: Send tokens, paymaster pay fee in token(USDC)

## Run

```sh
ts-node src/<script>
```
