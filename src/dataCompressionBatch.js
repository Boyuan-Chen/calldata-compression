const ethers = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const {
  sleep,
  calculateGas,
  brotliCompression,
  zlibCompression,
  zlibDictionaryCompression,
  getTransactionFromL1,
} = require("./utils");

const L1_NODE_WEB3_URL = process.env.L1_NODE_WEB3_URL;
const L2_NODE_WEB3_URL = "https://replica.boba.network";

const main = async () => {
  const L1Web3 = new ethers.providers.JsonRpcProvider(L1_NODE_WEB3_URL);
  const L2Web3 = new ethers.providers.JsonRpcProvider(L2_NODE_WEB3_URL);

  const latestL1BlockNumber = await L1Web3.getBlockNumber();
  const latestL2BlockNumber = await L2Web3.getBlockNumber();

  // Load CTC contract
  const CTCContract = new ethers.Contract(
    // BOBA CTC contract address
    "0xfBd2541e316948B259264c02f370eD088E04c3Db",
    // ABI
    new ethers.utils.Interface([
      "event TransactionBatchAppended(uint256 indexed _batchIndex, bytes32 _batchRoot, uint256 _batchSize, uint256 _prevTotalElements, bytes _extraData)",
    ]),
    // provider
    L1Web3
  );

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

  // Result
  let results = [];
  let rawTransactionData = [];

  // Settings
  let searchRange = 100_000;

  const transactionBatchAppendedEvents = await CTCContract.queryFilter(
    CTCContract.filters.TransactionBatchAppended(),
    latestL1BlockNumber - searchRange,
    latestL1BlockNumber
  );

  console.log(`Total events: ${transactionBatchAppendedEvents.length}`);

  // Sort out data for each event
  for (const event of transactionBatchAppendedEvents) {
    results.push(await getTransactionFromL1(L1Web3, event.transactionHash));
    await sleep(1000);
  }

  for (const result of results) {
    const rawTransaction = result.data;

    // Push data
    rawTransactionData.push(rawTransaction);

    // Compression algorithm
    brotliCompressionResult = brotliCompression(rawTransaction);
    zlibCompressionResult = zlibCompression(rawTransaction);
    zlibDictionaryCompressionResult = zlibDictionaryCompression(rawTransaction);

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

  const dumpPath = path.resolve(__dirname, "../data/BatchData.json");
  await fs.promises.writeFile(dumpPath, JSON.stringify(rawTransactionData));

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
    "Total Events": transactionBatchAppendedEvents.length,
  });
};

main();
