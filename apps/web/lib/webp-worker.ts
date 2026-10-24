/**
 * The WASM WebP encoder, in a Web Worker (lib/webp-wasm starts it): a page of 1600 px takes about a second to encode, which on the
 * main thread would freeze the progress bar. @jsquash/webp is imported here and nowhere else, so it is only fetched by a coach whose
 * browser cannot make WebP itself (WebKit, on a Mac and on an iPhone).
 */
export interface WebpJob {
  id: number;
  pixels: ArrayBuffer;
  width: number;
  height: number;
  /** 0-100, the encoder's own scale */
  quality: number;
}
export type WebpResult = { id: number; webp: ArrayBuffer } | { id: number; error: string };

const scope = self as unknown as { onmessage: ((e: MessageEvent<WebpJob>) => void) | null; postMessage(message: WebpResult, transfer?: Transferable[]): void };

scope.onmessage = async ({ data }) => {
  try {
    const { default: encode } = await import("@jsquash/webp/encode");
    const webp = await encode({ data: new Uint8ClampedArray(data.pixels), width: data.width, height: data.height } as ImageData, { quality: data.quality });
    scope.postMessage({ id: data.id, webp }, [webp]);
  } catch (err) {
    scope.postMessage({ id: data.id, error: String(err) });
  }
};
