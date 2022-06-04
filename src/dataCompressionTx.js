const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

const {
  remove0x,
  sleep,
  calculateGas,
  brotliCompression,
  zlibCompression,
  zlibDictionaryCompression,
  getTransaction,
} = require("./utils");

const L2_NODE_WEB3_URL = "https://replica.boba.network";

const main = async () => {
  const L2Web3 = new ethers.providers.JsonRpcProvider(L2_NODE_WEB3_URL);

  const latestBlockNumber = await L2Web3.getBlockNumber();

  // Check last 10 blocks and get calldata
  let totalTxs = 0;
  let countBadResults = 0;

  // Calculate compression rate
  let totalPreBytes = 0;
  let totalCompressionBytes = {
    brotli: 0,
    zlib: 0,
    zlibDictionary: 0,
  };

  // Calculate gas saving
  let totalPreGasCost = 0;
  let totalCompressionGasCost = {
    brotli: 0,
    zlib: 0,
    zlibDictionary: 0,
  };

  // Promise
  let promiseInput = [];
  let results = [];

  // Settings
  let searchRange = 100_000;
  let maxSearchRange = 1000;
  let searchingBlock = latestBlockNumber - searchRange;

  // raw tx
  const rawTransactions = [];

  while (searchingBlock <= latestBlockNumber) {
    if (
      promiseInput.length < maxSearchRange &&
      searchingBlock != latestBlockNumber
    ) {
      promiseInput.push(getTransaction(L2Web3, searchingBlock));
    } else {
      console.log(
        `Searching Status: \nBlock Range: ${
          searchingBlock - promiseInput.length
        }-${searchingBlock} \nRatio: ${
          Number(
            (1 - (latestBlockNumber - searchingBlock) / searchRange).toFixed(4)
          ) *
            100 +
          "%"
        }`
      );
      results = [...(await Promise.allSettled(promiseInput)), ...results];
      promiseInput = [];
      await sleep(5000);
    }
    searchingBlock++;
  }
  for (const result of results) {
    const transaction = result.value;
    if (typeof result.value === "undefined") {
      countBadResults++;
      continue;
    }
    if (transaction.queueOrigin === "sequencer") {
      const turing = transaction.l1Turing;
      let rawTransaction = transaction.rawTransaction;
      const turingVersion = "01";
      if (turing.length > 4) {
        const headerTuringLengthField = remove0x(
          ethers.BigNumber.from(remove0x(turing).length / 2).toHexString()
        ).padStart(4, "0");
        if (headerTuringLengthField.length > 4) {
          throw new Error("Turing length error!");
        }
        rawTransaction =
          "0x" +
          turingVersion +
          headerTuringLengthField +
          remove0x(rawTransaction) +
          remove0x(turing);
      } else {
        rawTransaction =
          "0x" + turingVersion + "0000" + remove0x(rawTransaction);
      }

      rawTransactions.push(rawTransaction);
      totalTxs++;

      // Compression algorithm
      brotliCompressionResult = brotliCompression(rawTransaction);
      zlibCompressionResult = zlibCompression(rawTransaction);
      zlibDictionaryCompressionResult =
        zlibDictionaryCompression(rawTransaction);

      // Store byte length
      totalPreBytes += rawTransaction.length;
      totalCompressionBytes.brotli += brotliCompressionResult.length;
      totalCompressionBytes.zlib += zlibCompressionResult.length;
      totalCompressionBytes.zlibDictionary +=
        zlibDictionaryCompressionResult.length;

      // Store gas cost
      totalPreGasCost += calculateGas(rawTransaction);
      totalCompressionGasCost.brotli += calculateGas(brotliCompressionResult);
      totalCompressionGasCost.zlib += calculateGas(zlibCompressionResult);
      totalCompressionGasCost.zlibDictionary += calculateGas(
        zlibDictionaryCompressionResult
      );
    }
  }

  const dumpPath = path.resolve(__dirname, "../data/transactionsData.json");
  await fs.promises.writeFile(dumpPath, JSON.stringify(rawTransactions));

  // Final report
  const estimateZlibFeeSavings =
    1 - totalCompressionGasCost.zlib / totalPreGasCost;
  const compressionZlibRatio = 1 - totalCompressionBytes.zlib / totalPreBytes;
  const estimateZlibDictionaryFeeSavings =
    1 - totalCompressionGasCost.zlibDictionary / totalPreGasCost;
  const compressionZlibDictionaryRatio =
    1 - totalCompressionBytes.zlibDictionary / totalPreBytes;
  const estimateBrotliFeeSavings =
    1 - totalCompressionGasCost.brotli / totalPreGasCost;
  const compressionBrotliRatio =
    1 - totalCompressionBytes.brotli / totalPreBytes;

  console.log({
    "Zlib compression Ratio": compressionZlibRatio,
    "Zlib Estimated Fee Savings": estimateZlibFeeSavings,
    "Zlib Dictionary compression Ratio": compressionZlibDictionaryRatio,
    "Zlib Dictionary Estimated Fee Savings": estimateZlibDictionaryFeeSavings,
    "Brotli compression Ratio": compressionBrotliRatio,
    "Brotli Estimated Fee Savings": estimateBrotliFeeSavings,
    "Total TXs": totalTxs,
    "Bad TX Results": countBadResults,
  });
};

main();
