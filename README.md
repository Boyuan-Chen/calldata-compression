# Calldata Compression

## Setup

Install the followings:

- [`Node.js` (14+)](https://nodejs.org/en/)
- [`npm`](https://www.npmjs.com/get-npm)
- [`yarn`](https://classic.yarnpkg.com/en/docs/install/)

* [`golang`](https://go.dev)

Clone the repo:

```bash
git clone https://github.com/Boyuan-Chen/calldata-compression.git
cd calldata-compression
```

Install packages

```bash
yarn install
cd go
go get
```

Add `.env` in the root directory

```
L1_NODE_WEB3_URL=https://mainnet.infura.io/v3/KEY
```

## Running compression tests

### Transaction data compression

```
yarn start:tx
```

### Batch data compression

```
yarn start:batch
```

### Benchmark tests

```
yarn test:speed:go
yarn test:speed:node
```

## How to compress in go and depress in node.js

We compress the data payload in go first:

```go
var in bytes.Buffer
b := []byte(transaction)
w := brotli.NewWriterLevel(&in, 11)
w.Write(b)
w.Close()
output := hex.EncodeToString(in.Bytes())
```

Then we share the output in nodejs and decompress it:

```js
const compressionUint8Array = Uint8Array.from(Buffer.from(output, 'hex'))
decompressionBuffer = brotli.decompress(compressionUint8Array)
console.log(Buffer.from(resdecompressionBuffertoString('utf-8'))
```

