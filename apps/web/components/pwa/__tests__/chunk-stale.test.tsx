import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChunkStaleView } from "../chunk-stale";

// next/dynamic loads the toast on the client only; here it is a marker
vi.mock("next/dynamic", () => ({ default: () => () => <span data-testid="chunk-offer" /> }));

// What lib/chunk-reload-script said about this page (window.h1tChunkState)
describe("ChunkStaleView", () => {
  it("error: raises the error screen with a ChunkLoadError, which the error boundary shows with Tải lại", () => {
    let thrown: unknown;
    try {
      renderToString(<ChunkStaleView state="error" />);
    } catch (e) {
      thrown = e;
    }
    expect((thrown as Error).name).toBe("ChunkLoadError");
  });

  it("toast: offers the update", () => {
    expect(renderToString(<ChunkStaleView state="toast" />)).toContain('data-testid="chunk-offer"');
  });

  it.each(["", "reload", "something-else"])("%j: nothing on screen", (state) => {
    expect(renderToString(<ChunkStaleView state={state} />)).toBe("");
  });
});
