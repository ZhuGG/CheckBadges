import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';

let workerPromise: Promise<TesseractWorker> | null = null;

async function loadWorker() {
  if (!workerPromise) {
    workerPromise = createWorker({
      logger: () => {}
    });
    const worker = await workerPromise;
    await worker.loadLanguage('fra+eng');
    await worker.initialize('fra+eng');
  }
  return workerPromise;
}

export async function recognizeFromDataUrl(
  dataUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await loadWorker();
  const result = await worker.recognize(dataUrl, undefined, {
    progress: (packet) => {
      if (packet.status === 'recognizing text' && onProgress) {
        onProgress(packet.progress);
      }
    }
  });

  return { text: result.data.text, confidence: result.data.confidence };
}

export async function terminateOcr() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
