// https://github.com/google/brotli
const brotli = require("brotli");
// https://nodejs.org/api/zlib.html
const zlib = require("zlib");

const fs = require("fs");
const path = require("path");

exports.remove0x = (str) => {
  if (str === undefined) {
    return str;
  }
  return str.startsWith("0x") ? str.slice(2) : str;
};

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

exports.calculateGas = (payload) => {
  totalGas = 0;
  for (const cha of this.remove0x(payload)) {
    if (cha === "0") {
      totalGas += 4;
    } else {
      totalGas += 16;
    }
  }
  return totalGas;
};

exports.brotliCompression = (payload) => {
  const compressionBuffer = brotli.compress(Buffer.from(payload), {
    mode: 1,
    quality: 11,
  });
  const compressionHex = Buffer.from(compressionBuffer).toString("hex");
  return compressionHex;
};

exports.zlibCompression = (payload) => {
  const compressionBuffer = zlib.deflateSync(payload, {
    level: 9,
  });
  const compressionHex = Buffer.from(compressionBuffer).toString("hex");
  return compressionHex;
};

exports.zlibDictionaryCompression = (payload) => {
  const dictionary = Buffer.from(
    "d86D22c02E301BE7C35e3Ef20962f614cAf32B7662cc86abac3fb09a19c8547391580f63a668613f".toLocaleLowerCase(),
    "utf-8"
  );
  const compressionBuffer = zlib.deflateSync(payload, {
    level: 9,
    dictionary,
  });
  const compressionHex = Buffer.from(compressionBuffer).toString("hex");
  return compressionHex;
};

exports.getTransaction = async (L2Web3, blockNumber) => {
  const block = await L2Web3.getBlock(blockNumber);
  const transactionHash = block.transactions[0];
  const transaction = await L2Web3.send("eth_getTransactionByHash", [
    transactionHash,
  ]);
  return transaction;
};

exports.getTransactionFromL1 = async (L1Web3, txHash) => {
  const transaction = await L1Web3.getTransaction(txHash);
  return transaction;
};

exports.brotliDecompress = (payload) => {
  const compressionUint8Array = Uint8Array.from(Buffer.from(payload, "hex"));
  decompressionBuffer = brotli.decompress(compressionUint8Array);
  return Buffer.from(decompressionBuffer).toString("utf-8");
};

exports.zlibDecompress = (payload) => {
  const compressionUint8Array = Uint8Array.from(Buffer.from(payload, "hex"));
  decompressionBuffer = zlib.inflateSync(compressionUint8Array);
  return Buffer.from(decompressionBuffer).toString("utf-8");
};

exports.dumpFile = async (filePath, data) => {
  const dumpPath = path.resolve(__dirname, filePath);
  await fs.promises.writeFile(dumpPath, JSON.stringify(data));
};

exports.loadFile = async (filePath) => {
  const dumpPath = path.resolve(
    __dirname,
    filePath
  );
  const jsonRaw = await fs.promises.readFile(dumpPath);
  return JSON.parse(jsonRaw.toString());
};
