const fs = require("fs");
const path = require("path");

const { brotliCompression, zlibCompression } = require("./utils");

const main = async () => {
  const dumpPath = path.resolve(__dirname, "../data/transactionsData.json");
  const transactionsJsonRaw = await fs.promises.readFile(dumpPath);
  const transactions = JSON.parse(transactionsJsonRaw.toString());

  // Loop Count
  const loopCount = 5;
  let totalTime = 0;

  console.log(`Total Txs: ${transactions.length} | Loop: ${loopCount}`);

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const transaction of transactions) {
      zlibCompression(transaction);
    }

    end = new Date().getTime();
    totalTime += end - start;
  }
  console.log(`Zlib Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount}`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const transaction of transactions) {
      brotliCompression(transaction);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Execution Time: ${end - start} ms | Loop: ${i + 1} time`);
  }
  console.log(`Brotli Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount}`);
};

main();
