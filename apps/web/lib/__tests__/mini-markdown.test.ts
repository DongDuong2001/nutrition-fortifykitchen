import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../mini-markdown";

describe("parseMarkdown: the few things a coach's lesson uses", () => {
  it("headings, paragraphs and bullets", () => {
    expect(parseMarkdown("## Ý chính\n\nMột câu.\nHai dòng.\n\n- a\n- b\n* c")).toEqual([
      { type: "heading", text: "Ý chính" },
      { type: "paragraph", spans: [{ text: "Một câu. Hai dòng." }] },
      { type: "list", items: [[{ text: "a" }], [{ text: "b" }], [{ text: "c" }]] },
    ]);
  });

  it("bold inside a line", () => {
    expect(parseMarkdown("Ăn **đủ đạm** mỗi bữa")).toEqual([
      { type: "paragraph", spans: [{ text: "Ăn " }, { text: "đủ đạm", bold: true }, { text: " mỗi bữa" }] },
    ]);
  });

  it("every heading level is one heading, and a # without a space is text", () => {
    expect(parseMarkdown("# A\n\n### B\n\n#C")).toEqual([
      { type: "heading", text: "A" },
      { type: "heading", text: "B" },
      { type: "paragraph", spans: [{ text: "#C" }] },
    ]);
  });

  it("empty text has no blocks; HTML stays text (nothing is injected)", () => {
    expect(parseMarkdown("  \n\n ")).toEqual([]);
    expect(parseMarkdown("<script>x</script>")).toEqual([{ type: "paragraph", spans: [{ text: "<script>x</script>" }] }]);
  });

  it("an unclosed ** stays as typed", () => {
    expect(parseMarkdown("a **b")).toEqual([{ type: "paragraph", spans: [{ text: "a **b" }] }]);
  });
});
