import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnterGlide, SwitchGlide } from "../switch-glide";

// What can be seen without a browser: the first render of both glides plays nothing and shows the content as it is. The motion
// itself (frames, directions, interrupts) is checked on the running app by tests/probes/glide_switch.py.
describe("SwitchGlide, first render", () => {
  it("draws the children of the id in a wrapper named after it, with no animation class and no inline transform", () => {
    const html = renderToStaticMarkup(
      <SwitchGlide id="dam" order={2} className="x">
        <p>Đạm</p>
      </SwitchGlide>
    );
    expect(html).toBe('<div data-glide="dam" class="x"><p>Đạm</p></div>');
  });
});

describe("EnterGlide, first render", () => {
  it("is a plain wrapper: no m-tab-in, no direction, until the id changes", () => {
    const html = renderToStaticMarkup(
      <EnterGlide id="explore" order={2} className="flex flex-col">
        <p>Khám phá</p>
      </EnterGlide>
    );
    expect(html).toContain('data-glide-enter="explore"');
    expect(html).toContain('class="flex flex-col"');
    expect(html).not.toContain("m-tab-in");
    expect(html).not.toContain("data-glide-dir");
    expect(html).not.toContain("--m-tab-dir");
  });
});
