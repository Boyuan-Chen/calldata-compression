const ethers = require("ethers");
require("dotenv").config();

const {
  calculateGas,
  brotliCompression,
  zlibCompression,
  zlibDictionaryCompression,
  getTransactionFromL1,
  dumpFile,
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
  let zlibCompressionRawTransactionData = [];
  let brotliCompressionRawTransactionData = [];

  // Settings
  let searchRange = 100_000;

  const transactionBatchAppendedEvents = await CTCContract.queryFilter(
    CTCContract.filters.TransactionBatchAppended(),
    latestL1BlockNumber - searchRange,
    latestL1BlockNumber
  );

  console.log(`Total events: ${transactionBatchAppendedEvents.length}`);

  // Sort out data for each event
  let maxBatchSize = 0;
  let minBatchSize = 0;

  let maxBatchTransactionHash = null;
  let minBatchTransactionHash = null;

  let maxBatchTransaction = null;
  let minBatchTransaction = null;

  for (const event of transactionBatchAppendedEvents) {
    const _batchSize = event.args._batchSize.toNumber();
    if (_batchSize > maxBatchSize) {
      maxBatchSize = _batchSize;
      maxBatchTransactionHash = event.transactionHash;
    }
    if (_batchSize < minBatchSize || minBatchSize === 0) {
      minBatchSize = _batchSize;
      minBatchTransactionHash = event.transactionHash;
    }
    results.push(await getTransactionFromL1(L1Web3, event.transactionHash));
  }

  maxBatchTransaction = await getTransactionFromL1(
    L1Web3,
    maxBatchTransactionHash
  );
  minBatchTransaction = await getTransactionFromL1(
    L1Web3,
    minBatchTransactionHash
  );

  maxBrotliCompressionResult = brotliCompression(maxBatchTransaction.data);
  maxZlibCompressionResult = zlibCompression(maxBatchTransaction.data);
  minBrotliCompressionResult = brotliCompression(minBatchTransaction.data);
  minZlibCompressionResult = zlibCompression(minBatchTransaction.data);

  maxBrotliCompressionPayload = [];
  maxZlibCompressionPayload = [];
  minBrotliCompressionPayload = [];
  minZlibCompressionPayload = [];

  // create an one hundred payload
  for (let i = 0; i < 100; i++) {
    maxBrotliCompressionPayload.push(maxBrotliCompressionResult);
    maxZlibCompressionPayload.push(maxZlibCompressionResult);
    minBrotliCompressionPayload.push(minBrotliCompressionResult);
    minZlibCompressionPayload.push(minZlibCompressionResult);
  }

  await dumpFile("../../data/maxBrotliCompressionData.json", maxBrotliCompressionPayload);
  await dumpFile("../../data/maxZlibCompressionData.json", maxZlibCompressionPayload);
  await dumpFile("../../data/minBrotliCompressionData.json", minBrotliCompressionPayload);
  await dumpFile("../../data/minZlibCompressionData.json", minZlibCompressionPayload);

  console.log({
    maxBatchSize,
    minBatchSize,
    maxBatchTransactionHash,
    minBatchTransactionHash,
  });

  for (const result of results) {
    const rawTransaction = result.data;

    // Push data
    rawTransactionData.push(rawTransaction);

    // Compression algorithm
    brotliCompressionResult = brotliCompression(rawTransaction);
    zlibCompressionResult = zlibCompression(rawTransaction);
    zlibDictionaryCompressionResult = zlibDictionaryCompression(rawTransaction);

    zlibCompressionRawTransactionData.push(zlibCompressionResult);
    brotliCompressionRawTransactionData.push(brotliCompressionResult);

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

  await dumpFile("../data/batchTxData.json", rawTransactionData);
  await dumpFile("../../data/zlibBatchData.json", zlibCompressionRawTransactionData);
  await dumpFile("../../data/brotliBatchData.json", brotliCompressionRawTransactionData);

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
