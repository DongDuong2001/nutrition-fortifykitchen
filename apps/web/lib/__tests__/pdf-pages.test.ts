import { describe, expect, it, vi } from "vitest";
import { PdfError, pageEncoder, type WebpEncoders } from "../pdf-pages";

// A browser whose canvas answers toBlob("image/webp") with a PNG (WebKit, on a Mac and on an iPhone) used to stop a PDF upload at page 1.
// The page is then encoded by the WASM encoder, down the same quality ladder (0.82 → 0.4) and under the same 1 MiB cap.
const blob = (type: string, bytes = 100) => new Blob([new Uint8Array(bytes)], { type });
const WEBP = (bytes?: number) => blob("image/webp", bytes);
const PNG = () => blob("image/png");
const MIB = 1024 * 1024;

const encoders = (over: Partial<WebpEncoders> = {}): WebpEncoders & { native: ReturnType<typeof vi.fn>; wasm: ReturnType<typeof vi.fn> } => ({
  native: vi.fn(async () => WEBP()),
  wasm: vi.fn(async () => WEBP()),
  ...over,
}) as never;

describe("pageEncoder: the browser's own WebP first", () => {
  it("a browser that makes WebP (Chrome, Edge, Android) never loads the WASM encoder", async () => {
    const enc = encoders();
    const out = await pageEncoder(enc)();
    expect(out.type).toBe("image/webp");
    expect(enc.wasm).not.toHaveBeenCalled();
  });

  it("a browser that answers with a PNG takes the WASM path, and the result is the WebP it made", async () => {
    const enc = encoders({ native: vi.fn(async () => PNG()), wasm: vi.fn(async () => WEBP(321)) });
    const out = await pageEncoder(enc)();
    expect(out.type).toBe("image/webp");
    expect(out.size).toBe(321);
    expect(enc.wasm).toHaveBeenCalledWith(0.82);
  });

  it("a browser that answers with nothing at all (toBlob gives null) takes it too", async () => {
    const enc = encoders({ native: vi.fn(async () => null) });
    expect((await pageEncoder(enc)()).type).toBe("image/webp");
    expect(enc.wasm).toHaveBeenCalledTimes(1);
  });

  it("the PNG answer is learnt once: the next pages go straight to WASM, the browser is not asked to make a PNG for each", async () => {
    const enc = encoders({ native: vi.fn(async () => PNG()) });
    const encode = pageEncoder(enc);
    await encode();
    await encode();
    await encode();
    expect(enc.native).toHaveBeenCalledTimes(1);
    expect(enc.wasm).toHaveBeenCalledTimes(3);
  });
});

describe("pageEncoder: the quality ladder and the 1 MiB cap", () => {
  it("a page over the cap is tried again at 0.7, 0.55 and 0.4, and the first that fits is kept (native)", async () => {
    const sizes = [2 * MIB, 1.5 * MIB, 900 * 1024, 10];
    const native = vi.fn(async (q: number) => WEBP(sizes[[0.82, 0.7, 0.55, 0.4].indexOf(q)]));
    const out = await pageEncoder(encoders({ native }))();
    expect(native.mock.calls.map((c) => c[0])).toEqual([0.82, 0.7, 0.55]);
    expect(out.size).toBe(900 * 1024);
  });

  it("the same ladder on the WASM path", async () => {
    const wasm = vi.fn(async (q: number) => WEBP(q > 0.6 ? 2 * MIB : 500));
    const out = await pageEncoder(encoders({ native: vi.fn(async () => PNG()), wasm }))();
    expect(wasm.mock.calls.map((c) => c[0])).toEqual([0.82, 0.7, 0.55]);
    expect(out.size).toBe(500);
  });

  it("a page still over 1 MiB at 0.4 is too-big, native or WASM", async () => {
    const big = () => WEBP(MIB + 1);
    const native = pageEncoder(encoders({ native: vi.fn(async () => big()) }));
    await expect(native()).rejects.toMatchObject({ kind: "too-big" });
    const wasm = vi.fn(async (quality: number) => (quality > 0 ? big() : big()));
    await expect(pageEncoder(encoders({ native: vi.fn(async () => PNG()), wasm }))()).rejects.toMatchObject({ kind: "too-big" });
    expect(wasm.mock.calls.map((c) => c[0])).toEqual([0.82, 0.7, 0.55, 0.4]);
  });

  it("exactly 1 MiB is kept", async () => {
    expect((await pageEncoder(encoders({ native: vi.fn(async () => WEBP(MIB)) }))()).size).toBe(MIB);
  });
});

describe("pageEncoder: no-webp now means a browser with neither", () => {
  it("a PNG from the browser and a WASM encoder that cannot start is no-webp", async () => {
    const enc = encoders({ native: vi.fn(async () => PNG()), wasm: vi.fn(async () => Promise.reject(new Error("WebAssembly is not defined"))) });
    const err = await pageEncoder(enc)().catch((e) => e);
    expect(err).toBeInstanceOf(PdfError);
    expect(err.kind).toBe("no-webp");
  });

  it("says to update the browser", () => {
    expect(new PdfError("no-webp").message).toBe("Trình duyệt này chưa tạo được ảnh trang. Cập nhật trình duyệt rồi thử lại.");
  });

  it("a WASM encoder that answers with something that is not WebP is no-webp as well", async () => {
    const enc = encoders({ native: vi.fn(async () => PNG()), wasm: vi.fn(async () => PNG()) });
    await expect(pageEncoder(enc)()).rejects.toMatchObject({ kind: "no-webp" });
  });
});
