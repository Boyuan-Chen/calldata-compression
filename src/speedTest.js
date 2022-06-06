const fs = require("fs");
const path = require("path");

const { brotliDecompress, zlibDecompress } = require("./utils");

const main = async () => {
  const dumpZlibPath = path.resolve(__dirname, "../data/zlibBatchData.json");
  const zlibCompressionJsonRaw = await fs.promises.readFile(dumpZlibPath);
  const zlibCompression = JSON.parse(zlibCompressionJsonRaw.toString());

  const dumpBrotliPath = path.resolve(
    __dirname,
    "../data/brotliBatchData.json"
  );
  const brotliCompressionJsonRaw = await fs.promises.readFile(dumpBrotliPath);
  const brotliCompression = JSON.parse(brotliCompressionJsonRaw.toString());

  // Loop Count
  const loopCount = 5;

  // Time
  let totalTime = 0;
  let avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of brotliCompression) {
      brotliDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(
      `Brotli Decompression Execution Time: ${end - start} ms | Loop: ${
        i + 1
      } time`
    );
  }
  console.log(
    `Brotli Decompression Speed Test: ${
      totalTime / loopCount
    } ms | Loop: ${loopCount}`
  );

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of zlibCompression) {
      zlibDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(
      `Brotli Decompression Execution Time: ${end - start} ms | Loop: ${
        i + 1
      } time`
    );
  }
  console.log(
    `Brotli Decompression Speed Test: ${
      totalTime / loopCount
    } ms | Loop: ${loopCount}`
  );
};

main();
