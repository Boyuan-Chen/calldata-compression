const ethers = require("ethers");
require("dotenv").config();

const L1_NODE_WEB3_URL = process.env.L1_NODE_WEB3_URL;
const L2_NODE_WEB3_URL = "https://replica.boba.network";

const main = async () => {
  const L1Web3 = new ethers.providers.JsonRpcProvider(L1_NODE_WEB3_URL);
  const L2Web3 = new ethers.providers.JsonRpcProvider(L2_NODE_WEB3_URL);

  const latestL1BlockNumber = await L1Web3.getBlockNumber();
  const latestL2BlockNumber = await L2Web3.getBlockNumber();

  const calldataCompressionStartingPoint = 15168325;
  const searchRange = 50000;

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

  const SCCContract = new ethers.Contract(
    "0xdE7355C971A5B733fe2133753Abd7e5441d441Ec",
    new ethers.utils.Interface([
      "event StateBatchAppended(uint256 indexed _batchIndex, bytes32 _batchRoot, uint256 _batchSize, uint256 _prevTotalElements, bytes _extraData)",
    ]),
    L1Web3
  );

  const StateBatchAppendedEvents = await SCCContract.queryFilter(
    SCCContract.filters.StateBatchAppended(),
    latestL1BlockNumber - searchRange,
    latestL1BlockNumber
    );

  let totalGasUsedSCC = 0;
  let totalBatchSizeSCC = 0;
  for (const event of StateBatchAppendedEvents) {
    totalBatchSizeSCC += event.args._batchSize.toNumber();
    const receipt = await event.getTransactionReceipt();
    const gasUsed = receipt.gasUsed.toNumber();
    totalGasUsedSCC += gasUsed;
    console.log({ _batchIndex: event.args._batchIndex.toNumber(), gasUsed })
  }
  const avgSCC = totalGasUsedSCC / totalBatchSizeSCC;
  console.log({ avgSCC, totalGasUsedSCC, totalBatchSizeSCC });

  const transactionBatchAppendedEventsCompression =
    await CTCContract.queryFilter(
      CTCContract.filters.TransactionBatchAppended(),
      calldataCompressionStartingPoint,
      latestL1BlockNumber
    );

  let totalGasUsedCompression = 0;
  let totalBatchSizeCompression = 0;
  let totalNumberCompression = 0;

  for (const event of transactionBatchAppendedEventsCompression) {
    const _batchSize = event.args._batchSize.toNumber();
    totalBatchSizeCompression += _batchSize;
    const receipt = await event.getTransactionReceipt();
    const gasUsed = receipt.gasUsed.toNumber();
    totalGasUsedCompression += gasUsed;
    totalNumberCompression += 1;

    console.log(
      JSON.stringify({
        _batchSize,
        gasUsed,
        _batchIndex: event.args._batchIndex.toNumber(),
        avg: gasUsed / _batchSize,
      })
    );
  }

  console.log({
    totalBatchSizeCompression,
    totalGasUsedCompression,
    avgGasUsedCompresion: totalGasUsedCompression / totalBatchSizeCompression,
    avgBatchSize: totalBatchSizeCompression / totalNumberCompression,
    avgTotal: totalGasUsedCompression / totalBatchSizeCompression + avgSCC,
  });

  const transactionBatchAppendedEvents = await CTCContract.queryFilter(
    CTCContract.filters.TransactionBatchAppended(),
    calldataCompressionStartingPoint - searchRange,
    calldataCompressionStartingPoint
  );

  let totalGasUsed = 0;
  let totalBatchSize = 0;
  let totalNumber = 0;

  for (const event of transactionBatchAppendedEvents) {
    const _batchSize = event.args._batchSize.toNumber();
    totalBatchSize += _batchSize;
    const receipt = await event.getTransactionReceipt();
    const gasUsed = receipt.gasUsed.toNumber();
    totalGasUsed += gasUsed;
    totalNumber += 1;

    console.log(
      JSON.stringify({
        _batchSize,
        gasUsed,
        _batchIndex: event.args._batchIndex.toNumber(),
        avg: gasUsed / _batchSize,
      })
    );
  }

  console.log({
    totalBatchSize,
    totalGasUsed,
    avgGasUsed: totalGasUsed / totalBatchSize,
    avgBatchSize: totalBatchSize / totalNumber,
    avgTotal: totalGasUsed / totalBatchSize + avgSCC,
  });
};

main().catch(console.error);
