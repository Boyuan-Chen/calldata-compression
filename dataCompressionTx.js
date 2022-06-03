const ethers = require("ethers");

// https://github.com/google/brotli
const brotli = require("brotli");
// https://nodejs.org/api/zlib.html
const zlib = require("zlib");

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
  let searchRange = 100000;
  let maxSearchRange = 1000;
  let searchingBlock = latestBlockNumber - searchRange;

  while (searchingBlock <= latestBlockNumber) {
    if (
      promiseInput.length < maxSearchRange &&
      searchingBlock != latestBlockNumber
    ) {
      promiseInput.push(getTransaction(L2Web3, searchingBlock));
    } else {
      console.log(
        `\nSearching Status: Block Range: ${searchingBlock - promiseInput.length}-${searchingBlock} Progess: ${
          Number((1 - (latestBlockNumber - searchingBlock) / searchRange).toFixed(4)) * 100 + "%"
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
      totalTxs++;

      // Compression algorithm
      brotliCompressionResult = brotliCompression(rawTransaction);
      zlibCompressionResult = zlibCompression(rawTransaction);
      zlibDictionaryCompressionResult =
        zlibDictionaryCompression(rawTransaction);

      // Store byte length
      totalPreBytes += remove0x(rawTransaction).length;
      totalCompressionBytes.brotli += remove0x(brotliCompressionResult).length;
      totalCompressionBytes.zlib += remove0x(zlibCompressionResult).length;
      totalCompressionBytes.zlibDictionary += remove0x(
        zlibDictionaryCompressionResult
      ).length;

      // Store gas cost
      totalPreGasCost += calculateGas(rawTransaction);
      totalCompressionGasCost.brotli += calculateGas(brotliCompressionResult);
      totalCompressionGasCost.zlib += calculateGas(zlibCompressionResult);
      totalCompressionGasCost.zlibDictionary += calculateGas(
        zlibDictionaryCompressionResult
      );
    }
  }

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
    "Zlib Compression Ratio": compressionZlibRatio,
    "Zlib Estimated Fee Savings": estimateZlibFeeSavings,
    "Zlib Dictionary Compression Ratio": compressionZlibDictionaryRatio,
    "Zlib Dictionary Estimated Fee Savings": estimateZlibDictionaryFeeSavings,
    "Brotli Compression Ratio": compressionBrotliRatio,
    "Brotli Estimated Fee Savings": estimateBrotliFeeSavings,
    "Total TXs": totalTxs,
    "Bad TX Results": countBadResults,
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
    if (cha === '0') {
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
