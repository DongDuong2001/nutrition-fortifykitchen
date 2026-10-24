import type { WebpJob, WebpResult } from "./webp-worker";

/**
 * WebP from a canvas by WASM, for a browser whose own `toBlob("image/webp")` answers with a PNG (WebKit). The encoding runs in a Web
 * Worker, started on the first page; a browser without workers encodes on the main thread. Nothing here is imported until the
 * fallback is needed (lib/pdf-pages), and a learner's screen never reaches it. `close` ends the worker.
 */
export function createWebpWasm(): { encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob>; close(): void } {
  let worker: Worker | null = null;
  // True once workers are known not to work here (none, or one that would not start): the main thread does the encoding then
  let workerFailed = typeof Worker === "undefined";
  let next = 0;
  const waiting = new Map<number, { resolve: (webp: ArrayBuffer) => void; reject: (err: Error) => void }>();

  const start = (): Worker => {
    const w = new Worker(new URL("./webp-worker.ts", import.meta.url), { type: "module" });
    w.onmessage = ({ data }: MessageEvent<WebpResult>) => {
      const job = waiting.get(data.id);
      waiting.delete(data.id);
      if (!job) return;
      if ("error" in data) job.reject(new Error(data.error));
      else job.resolve(data.webp);
    };
    // The worker could not start (a policy, an old browser): everything waiting fails, and the next page tries the main thread
    w.onerror = () => {
      waiting.forEach((job) => job.reject(new Error("worker")));
      waiting.clear();
      w.terminate();
      if (worker === w) worker = null;
      workerFailed = true;
    };
    return w;
  };

  const inWorker = (job: Omit<WebpJob, "id">): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
      const id = ++next;
      waiting.set(id, { resolve, reject });
      (worker ??= start()).postMessage({ ...job, id }, [job.pixels]);
    });

  const onMainThread = async (job: Omit<WebpJob, "id">): Promise<ArrayBuffer> => {
    const { default: encode } = await import("@jsquash/webp/encode");
    return encode({ data: new Uint8ClampedArray(job.pixels), width: job.width, height: job.height } as ImageData, { quality: job.quality });
  };

  return {
    async encode(canvas, quality) {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
      // A copy for every try: the worker takes its buffer, and the next rung of the quality ladder needs the pixels again
      const job = () => ({ pixels: data.buffer.slice(0) as ArrayBuffer, width, height, quality: Math.round(quality * 100) });
      let webp: ArrayBuffer;
      if (workerFailed) webp = await onMainThread(job());
      else {
        try {
          webp = await inWorker(job());
        } catch (err) {
          // The worker would not start: this page and the next ones are encoded on the main thread. Any other failure is the encoder's.
          if (!workerFailed) throw err;
          webp = await onMainThread(job());
        }
      }
      return new Blob([webp], { type: "image/webp" });
    },
    close() {
      worker?.terminate();
      worker = null;
    },
  };
}
