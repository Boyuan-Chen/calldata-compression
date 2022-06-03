const ethers = require("ethers");
require("dotenv").config();

// https://github.com/google/brotli
const brotli = require("brotli");
// https://nodejs.org/api/zlib.html
const zlib = require("zlib");

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
  let totalPreBytes = [];
  let totalCompressionBytes = [];

  // Calculate gas saving
  let totalPreGasCost = [];
  let totalCompressionGasCost = [];

  // Promise
  let promiseInput = [];
  let results = [];

  // Settings
  let searchRange = 100000;

  // Count
  let searchingEvent = 0;
  let resultCount = 0;

  const transactionBatchAppendedEvents = await CTCContract.queryFilter(
    CTCContract.filters.TransactionBatchAppended(),
    latestL1BlockNumber - searchRange,
    latestL1BlockNumber
  );

  console.log(`Total events: ${transactionBatchAppendedEvents.length}`);

  // Sort out data for each event
  for (const event of transactionBatchAppendedEvents) {
    const _prevTotalElements = event.args._prevTotalElements;
    const _batchSize = event.args._batchSize;
    console.log(
      `\nSearching Status: Block Range: ${_prevTotalElements.toNumber()}-${
        _prevTotalElements.toNumber() + _batchSize.toNumber()
      } Progess: ${
        Number(
          (searchingEvent / transactionBatchAppendedEvents.length).toFixed(4)
        ) *
          100 +
        "%"
      }`
    );
    for (let i = 0; i < _batchSize.toNumber(); i++) {
      promiseInput.push(
        getTransaction(L2Web3, _prevTotalElements.toNumber() + i)
      );
    }
    results.push(await Promise.allSettled(promiseInput));
    await sleep(5000);
    searchingEvent++;
  }

  for (const result of results) {
    if (typeof totalCompressionBytes[resultCount] === "undefined") {
      totalPreBytes[resultCount] = 0;
      totalCompressionBytes[resultCount] = {
        brotli: 0,
        zlib: 0,
        zlibDictionary: 0,
      };
      totalPreGasCost[resultCount] = 0;
      totalCompressionGasCost[resultCount] = {
        brotli: 0,
        zlib: 0,
        zlibDictionary: 0,
      };
    }
    for (const transactions of result) {
      const transaction = transactions.value;
      if (typeof transactions.value === "undefined") {
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

        // Compression algorithm
        brotliCompressionResult = brotliCompression(rawTransaction);
        zlibCompressionResult = zlibCompression(rawTransaction);
        zlibDictionaryCompressionResult =
          zlibDictionaryCompression(rawTransaction);

        // Store byte length
        totalPreBytes[resultCount] += remove0x(rawTransaction).length;
        totalCompressionBytes[resultCount].brotli += remove0x(
          brotliCompressionResult
        ).length;
        totalCompressionBytes[resultCount].zlib += remove0x(
          zlibCompressionResult
        ).length;
        totalCompressionBytes[resultCount].zlibDictionary += remove0x(
          zlibDictionaryCompressionResult
        ).length;

        // Store gas cost
        totalPreGasCost[resultCount] += calculateGas(rawTransaction);
        totalCompressionGasCost[resultCount].brotli += calculateGas(
          brotliCompressionResult
        );
        totalCompressionGasCost[resultCount].zlib += calculateGas(
          zlibCompressionResult
        );
        totalCompressionGasCost[resultCount].zlibDictionary += calculateGas(
          zlibDictionaryCompressionResult
        );
      }
    }
    console.log(`calculated ${resultCount} event!`)
    resultCount++;
  }

  // Final report
  const estimateZlibFeeSavings =
    1 -
    totalCompressionGasCost.reduce((acc, cur, index) => {
      return acc + cur.zlib / totalPreGasCost[index];
    }, 0) /
      totalCompressionGasCost.length;
  const compressionZlibRatio =
    1 -
    totalCompressionBytes.reduce((acc, cur, index) => {
      return acc + cur.zlib / totalPreBytes[index];
    }, 0) /
      totalCompressionGasCost.length;
  const estimateZlibDictionaryFeeSavings =
    1 -
    totalCompressionGasCost.reduce((acc, cur, index) => {
      return acc + cur.zlibDictionary / totalPreGasCost[index];
    }, 0) /
      totalCompressionGasCost.length;
  const compressionZlibDictionaryRatio =
    1 -
    totalCompressionBytes.reduce((acc, cur, index) => {
      return acc + cur.zlibDictionary / totalPreBytes[index];
    }, 0) /
      totalCompressionGasCost.length;
  const estimateBrotliFeeSavings =
    1 -
    totalCompressionGasCost.reduce((acc, cur, index) => {
      return acc + cur.brotli / totalPreGasCost[index];
    }, 0) /
      totalCompressionGasCost.length;
  const compressionBrotliRatio =
    1 -
    totalCompressionBytes.reduce((acc, cur, index) => {
      return acc + cur.brotli / totalPreBytes[index];
    }, 0) /
      totalCompressionGasCost.length;

  console.log({
    "Zlib Compression Ratio": compressionZlibRatio,
    "Zlib Estimated Fee Savings": estimateZlibFeeSavings,
    "Zlib Dictionary Compression Ratio": compressionZlibDictionaryRatio,
    "Zlib Dictionary Estimated Fee Savings": estimateZlibDictionaryFeeSavings,
    "Brotli Compression Ratio": compressionBrotliRatio,
    "Brotli Estimated Fee Savings": estimateBrotliFeeSavings,
    "Total Batches": resultCount,
  });
};

const remove0x = (str) => {
  if (str === undefined) {
    return str;
  }
  return str.startsWith("0x") ? str.slice(2) : str;
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const calculateGas = (payload) => {
  totalGas = 0;
  for (const cha of remove0x(payload)) {
    if (cha === "0") {
      totalGas += 4;
    } else {
      totalGas += 16;
    }
  }
  return totalGas;
};

const brotliCompression = (payload) => {
  const compressionBuffer = brotli.compress(remove0x(payload), {
    mode: 1,
    quality: 11,
  });
  const compressionHex = Buffer.from(compressionBuffer).toString("hex");
  return compressionHex;
};

const zlibCompression = (payload) => {
  const compressionBuffer = zlib.deflateSync(payload, {
    level: 9,
  });
  const compressionHex = Buffer.from(compressionBuffer).toString("hex");
  return compressionHex;
};

const zlibDictionaryCompression = (payload) => {
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

const getTransaction = async (L2Web3, blockNumber) => {
  const block = await L2Web3.getBlock(blockNumber);
  const transactionHash = block.transactions[0];
  const transaction = await L2Web3.send("eth_getTransactionByHash", [
    transactionHash,
  ]);
  return transaction;
};

main();
