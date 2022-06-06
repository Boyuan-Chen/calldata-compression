const { brotliDecompress, zlibDecompress, loadFile } = require("./utils");

const main = async () => {
  const zlibCompression = await loadFile("../../data/zlibBatchData.json")
  const brotliCompression = await loadFile("../../data/brotliBatchData.json")
  const maxBrotliCompression = await loadFile("../../data/maxBrotliCompressionData.json")
  const minBrotliCompression = await loadFile("../../data/minBrotliCompressionData.json")
  const maxZlibCompression = await loadFile("../../data/maxZlibCompressionData.json")
  const minZlibCompression = await loadFile("../../data/minZlibCompressionData.json")

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

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount}`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of zlibCompression) {
      zlibDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount}`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of maxBrotliCompression) {
      brotliDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time (worst case)`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount} (worst case)`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of minBrotliCompression) {
      brotliDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time (best case)`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount} (best case)`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of maxZlibCompression) {
      zlibDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time (worst case)`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount} (worst case)`);

  totalTime = 0;
  avgTime = 0;

  for (let i = 0; i < loopCount; i++) {
    start = new Date().getTime();

    for (const payload of minZlibCompression) {
        zlibDecompress(payload);
    }

    end = new Date().getTime();
    totalTime += end - start;

    console.log(`Brotli Decompression Execution Time: ${end - start} ms | Loop: ${i + 1} time (best case)`);
  }
  console.log(`Brotli Decompression Speed Test: ${totalTime / loopCount} ms | Loop: ${loopCount} (best case)`);

};

main();
