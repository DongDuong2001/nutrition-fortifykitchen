import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { edibleKind, edibleServings, removedServings } from "../../scripts/edible-part";
import { MOCK_FOODS } from "../mock/foods";

const food = (nameVi: string, category: string, labels: string[], source = "usda_sr_legacy") => ({
  nameVi,
  category,
  source,
  servings: labels.map((label) => ({ label, grams: 100 })),
});
const labelsOf = (f: { servings: { label: string }[] }) => f.servings.map((s) => s.label);

describe("edibleServings (cc-67 part 2): grams of the edible part only", () => {
  it("takes every unit serving off fruit and keeps the gram ones", () => {
    expect(labelsOf(edibleServings(food("Chuối", "trai_cay", ["1 trái nhỏ", "1 trái vừa", "1 trái lớn", "100 g"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Chà là", "trai_cay", ["30 g", "3 quả", "100 g"])))).toEqual(["30 g", "100 g"]);
    expect(labelsOf(edibleServings(food("Dưa hấu", "trai_cay", ["100 g", "1 khẩu phần (NLEA)", "1 chén cắt miếng"])))).toEqual(["100 g"]);
    // A fruit with only counts is left with 100 g
    expect(edibleServings(food("Mơ tươi", "trai_cay", ["1 quả", "1 nắm (5 quả)"])).servings).toEqual([{ label: "100 g", grams: 100 }]);
  });

  it("does the same for the foods sold with a peel, a shell or a bone", () => {
    expect(labelsOf(edibleServings(food("Chuối xanh (sống)", "rau", ["100 g", "1 quả (bỏ vỏ)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Bắp/ngô ngọt", "tinh_bot", ["100 g", "1 bắp vừa"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Ngô nếp (luộc, cả bắp)", "tinh_bot", ["100 g", "1 bắp vừa (hạt)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Cua biển (hấp)", "dam", ["100 g", "1 con cua biển (thịt)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Ốc bươu", "dam", ["100 g", "1 con (ruột)", "1 lạng (100 g)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Sò điệp (hấp)", "dam", ["100 g", "1 con sò điệp (thịt)", "1 phần ăn (5 con)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Cánh gà (nướng)", "dam", ["100 g", "1 cánh gà (phần ăn được)"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Sườn non heo (sống)", "dam", ["100 g", "1 miếng sườn", "1 phần ăn"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Chân giò heo (sống)", "dam", ["100 g", "1 khúc chân giò"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Chim cút (sống)", "dam", ["100 g", "1 con chim cút (phần ăn được)"])))).toEqual(["100 g"]);
  });

  it("takes only the whole-fish servings off fish", () => {
    expect(labelsOf(edibleServings(food("Cá diếc (sống)", "dam", ["1 con vừa (cá 150 g)", "1 con nhỏ (cá 100 g)", "100 g"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Cá lóc (sống)", "dam", ["100 g", "1 khúc cá lóc"])))).toEqual(["100 g"]);
    expect(labelsOf(edibleServings(food("Cá saba Na Uy (nướng)", "dam", ["100 g", "1 miếng saba (nửa con)"])))).toEqual(["100 g"]);
    // A boneless fillet keeps its piece
    expect(labelsOf(edibleServings(food("Cá hồi phi lê", "dam", ["100 g", "1 miếng phi lê"])))).toEqual(["100 g", "1 miếng phi lê"]);
    expect(labelsOf(edibleServings(food("Cá hồi", "dam", ["1 miếng", "100 g"])))).toEqual(["1 miếng", "100 g"]);
  });

  it("keeps eggs, dishes, the user's own foods, meat with no bone and vegetables by their units", () => {
    for (const f of [
      food("Trứng gà", "dam", ["1 quả vừa (trứng 50–55 g)", "100 g"]),
      food("Trứng cút", "dam", ["1 quả trứng cút", "100 g"]),
      food("Hột vịt lộn", "mon_viet", ["1 quả vừa", "100 g"]),
      food("Cơm tấm sườn", "mon_viet", ["1 dĩa vừa", "100 g"]),
      food("Sườn xào chua ngọt", "cua_toi", ["1 phần"], "user"),
      food("Thịt chân giò heo (luộc)", "dam", ["1 miếng vừa", "100 g"]),
      food("Ức gà luộc", "dam", ["100 g", "1/2 ức gà (bỏ xương, da)"]),
      food("Đùi gà bỏ da", "dam", ["100 g", "4 oz"]),
      food("Tim gà (sống)", "dam", ["100 g", "1 quả tim gà"]),
      food("Mực ống", "dam", ["100 g", "1 con vừa (thân và râu)"]),
      food("Tôm khô", "dam", ["100 g", "1 nắm"]),
      food("Cà rốt", "rau", ["100 g", "1 củ vừa"]),
      food("Ớt chuông đỏ", "rau", ["100 g", "1 quả"]),
      food("Ngô bao tử", "rau", ["100 g", "1 bắp"]),
      food("Nước dừa", "do_uong", ["1 ly", "100 ml"]),
      food("Red Bull", "do_uong", ["1 lon (250 ml)"]),
      food("Mật mía", "an_vat", ["1 muỗng canh"]),
    ]) {
      expect(edibleServings(f), f.nameVi).toBe(f);
    }
  });

  it("keeps a serving by weight or volume of a food that loses its units", () => {
    expect(labelsOf(edibleServings(food("Cá cơm cả xương", "dam", ["100 g", "3 oz"])))).toEqual(["100 g", "3 oz"]);
    expect(labelsOf(edibleServings(food("Dâu tây", "trai_cay", ["100 g", "1 chén (cup), chưa rã đông", "150 ml"])))).toEqual(["100 g", "150 ml"]);
  });

  it("names the servings a food loses, for the data scan", () => {
    expect(removedServings(food("Táo Envy", "trai_cay", ["1 trái vừa", "100 g"]))).toEqual(["1 trái vừa"]);
    expect(removedServings(food("Trứng gà", "dam", ["1 quả", "100 g"]))).toEqual([]);
    expect(edibleKind(food("Cua đồng", "dam", []))).toBe("other");
    expect(edibleKind(food("Cánh gà (sống)", "dam", []))).toBe("other");
    expect(edibleKind(food("Quả bơ", "beo", []))).toBe("other");
    expect(edibleKind(food("Gạo tẻ", "tinh_bot", []))).toBeNull();
  });

  it("leaves the demo catalogue's fruit with 100 g and its gram servings, and its eggs with their quả", () => {
    const named = (name: string) => MOCK_FOODS.find((f) => f.nameVi === name)!;
    expect(labelsOf(named("Chuối"))).toEqual(["100 g"]);
    expect(labelsOf(named("Táo Envy"))).toEqual(["100 g"]);
    expect(labelsOf(named("Bơ (trái)"))).toEqual(["100 g"]);
    expect(labelsOf(named("Chà là"))).toEqual(["30 g", "100 g"]);
    expect(named("Trứng gà").servings.some((s) => /quả/.test(s.label))).toBe(true);
  });
});

// ---- The data scan (npm run scan:edible): writes docs/data/edible-part-scan-2026-10-19.md and the importer file for Dong ----

interface ScanFood {
  key: string;
  nameVi: string;
  category: string;
  source: string;
  servings: { label: string; grams: number }[];
  origin: string;
}

const RESEARCH = process.env.FOOD_RESEARCH_DIR ?? path.join(os.homedir(), "Documents/HITMicro/food-research");
const ROOT = path.resolve(__dirname, "../../../..");

function researchFoods(): ScanFood[] {
  const files = readdirSync(RESEARCH)
    .filter((f) => /^h1t-foods-.*\.json$/.test(f) || f === "recipe-dishes-for-mock.json")
    .map((f) => ({ f, at: statSync(path.join(RESEARCH, f)).mtimeMs }))
    .sort((a, b) => a.at - b.at);
  const byKey = new Map<string, ScanFood>();
  for (const { f } of files) {
    const rows: unknown = JSON.parse(readFileSync(path.join(RESEARCH, f), "utf8"));
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (!r || typeof r !== "object" || !("name_vi" in r)) continue;
      const row = r as { source?: string; source_id?: string; name_vi: string; category?: string; portions?: { label_vi: string; grams: number }[] };
      const key = `${row.source ?? "?"}|${row.source_id ?? row.name_vi}`;
      // Later files (by date) replace earlier ones: the newest units import wins
      byKey.set(key, {
        key,
        nameVi: row.name_vi,
        category: row.category ?? "",
        source: row.source ?? "",
        servings: (row.portions ?? []).map((p) => ({ label: p.label_vi, grams: p.grams })),
        origin: f,
      });
    }
  }
  return [...byKey.values()];
}

const KIND_TEXT: Record<string, string> = {
  fruit: "trái cây",
  fish: "cá nguyên con hoặc khúc có xương",
  other: "có vỏ, hạt, lõi hoặc xương (chuối, bơ, dừa, mía, bắp, tôm, cua, ốc, sò, cánh gà, sườn)",
};

const RENAMES: Array<{ match: (f: ScanFood) => boolean; to: (f: ScanFood) => string; why: string }> = [
  { match: (f) => f.nameVi === "Quả bơ", to: () => "Bơ (trái)", why: "Bơ lạt và Bơ đậu phộng đã có, nên chỉ cần thẻ ngắn để phân biệt" },
  { match: (f) => /\((?:bóc vỏ|cả vỏ)\)$/.test(f.nameVi), to: (f) => f.nameVi.replace(/\s*\((?:bóc vỏ|cả vỏ)\)$/, ""), why: "bỏ chữ vỏ trong tên" },
  { match: (f) => /\(luộc, bỏ vỏ\)$/.test(f.nameVi), to: (f) => f.nameVi.replace("(luộc, bỏ vỏ)", "(luộc)"), why: "bỏ chữ bỏ vỏ trong tên" },
];

function scan(foods: ScanFood[]) {
  const remove = foods.flatMap((f) => {
    const kind = edibleKind(f);
    const labels = removedServings(f);
    return kind && labels.length > 0 ? [{ f, kind, labels, keep: f.servings.map((s) => s.label).filter((l) => !labels.includes(l)) }] : [];
  });
  const renames = foods.flatMap((f) => {
    const rule = RENAMES.find((x) => x.match(f));
    return rule ? [{ f, to: rule.to(f), why: rule.why }] : [];
  });
  const keptUnits = foods.filter((f) => !edibleKind(f) && f.servings.some((s) => !/^[\d.,/ ]+\s*(?:g|kg|oz|ml|l)(?=$|[\s(])/i.test(s.label)));
  const reasonOf = (f: ScanFood) =>
    /^(trứng|hột vịt)/i.test(f.nameVi) ? "trứng: vẫn ghi theo quả, app tự trừ vỏ" :
    f.category === "mon_viet" || f.category === "cua_toi" ? "món ăn: ghi theo phần" :
    f.category === "bo_sung" ? "thực phẩm bổ sung: ghi theo viên" :
    f.category === "do_uong" || f.category === "beverage" ? "đồ uống: ghi theo ly, chai, lon" :
    /^(khoai|củ)/i.test(f.nameVi) ? "củ, khoai: giữ đơn vị củ (vỏ mỏng, nhiều dòng ghi sẵn bỏ vỏ), Hao quyết nếu muốn đổi sang gam" :
    f.category === "rau" ? "rau: phần bỏ đi nhỏ, đơn vị chén, cây, quả vẫn dùng được" :
    "không có phần bỏ đi (thịt, nội tạng, đồ chế biến)";
  return { remove, renames, kept: keptUnits.map((f) => ({ f, why: reasonOf(f) })) };
}

const table = (head: string[], rows: string[][]) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ").replace(/\n/g, " ")} |`)].join("\n");

describe("the data scan", () => {
  it.runIf(process.env.EDIBLE_SCAN && existsSync(RESEARCH))("writes docs/data/edible-part-scan-2026-10-19.md and edible-part-portions-2026-10-19.json", () => {
    const research = researchFoods();
    const web: ScanFood[] = MOCK_FOODS.map((f) => ({ key: `web|${f.id}`, nameVi: f.nameVi, category: f.category, source: f.source, servings: f.servings, origin: "lib/mock" }));
    // The web mock catalogue already went through edibleServings, so scan it as the research row it came from where there is one
    const result = scan(research);
    const kindCount = new Map<string, number>();
    for (const r of result.remove) kindCount.set(r.kind, (kindCount.get(r.kind) ?? 0) + 1);
    const webLeft = web.filter((f) => edibleKind(f) && f.servings.some((s) => !/^[\d.,/ ]+\s*(?:g|kg|oz|ml|l)(?=$|[\s(])/i.test(s.label)));

    const md = [
      "# Quét phần ăn được, 19/10/2026 (cc-67 phần 2)",
      "",
      `Quy tắc (Hao 19/10): trái cây và món bán kèm phần bỏ đi (vỏ, hạt, xương, vỏ sò) ghi theo gam phần ăn được. Không còn đơn vị trái, quả, con, miếng cho các món này. Giá trị dinh dưỡng đã tính trên 100 g phần ăn được (USDA, NIN). Trứng là ngoại lệ: vẫn ghi theo quả, app tự trừ vỏ.`,
      "",
      `Nguồn quét: ${research.length} món trong \`food-research/h1t-foods-*.json\` (file mới hơn thay file cũ, kể cả h1t-foods-units-import.json) và ${web.length} món mẫu của web (lib/mock). Mã phân loại: \`apps/web/scripts/edible-part.ts\`. Chạy lại: \`npm run scan:edible\` trong apps/web.`,
      "",
      "## Tóm tắt",
      "",
      table(["Nhóm", "Số món bỏ đơn vị"], [...kindCount].map(([k, n]) => [KIND_TEXT[k] ?? k, String(n)]).concat([["Tổng", String(result.remove.length)]])),
      "",
      `Web: món mẫu (lib/mock) đã bỏ đơn vị. Trái cây thật bỏ đơn vị ngay khi nạp danh mục (\`weighedFruit\` trong lib/mock/foods.ts, cả api-client và danh mục lưu máy). Cá, hải sản, ốc, cua, món còn xương và chuối, bơ, dừa, mía, bắp nằm trong DB: Dong chạy importer với \`docs/data/edible-part-portions-2026-10-19.json\`.`,
      `Món mẫu web còn đơn vị sau khi lọc: ${webLeft.length === 0 ? "không có" : webLeft.map((f) => f.nameVi).join(", ")}.`,
      "",
      "## Món bỏ đơn vị (giữ lại 100 g và các khẩu phần theo gam)",
      "",
      table(
        ["Món", "Nguồn và mã", "Nhóm", "Loại", "Đơn vị hiện có (bỏ)", "Giữ", "Việc cần làm"],
        result.remove
          .sort((a, b) => a.kind.localeCompare(b.kind) || a.f.nameVi.localeCompare(b.f.nameVi, "vi"))
          .map(({ f, kind, labels, keep }) => [f.nameVi, f.key.replace("|", " "), f.category, kind, labels.join("; "), keep.join("; ") || "100 g", "Bỏ các khẩu phần đơn vị trong DB"])
      ),
      "",
      "## Đổi tên gợi ý (tên giữ ngắn, không có thịt quả, bỏ vỏ)",
      "",
      table(["Tên hiện có", "Nguồn và mã", "Tên mới", "Lý do"], result.renames.map(({ f, to, why }) => [f.nameVi, f.key.replace("|", " "), to, why])),
      "",
      "Tên có vỏ như Bơ vỏ tím, Bơ vỏ xanh là tên giống, giữ nguyên.",
      "",
      "## Giữ đơn vị có chủ ý",
      "",
      table(
        ["Lý do", "Số món", "Ví dụ"],
        [...result.kept.reduce((m, { f, why }) => m.set(why, [...(m.get(why) ?? []), f.nameVi]), new Map<string, string[]>())].map(([why, names]) => [why, String(names.length), [...new Set(names)].slice(0, 6).join(", ")])
      ),
      "",
    ].join("\n");

    const json = {
      generated: "2026-10-19",
      note: "cc-67 part 2. For Dong's importer: delete the listed unit portions (label_vi) of each food, keep the rest; apply the renames. Nutrients stay as they are (per 100 g edible part).",
      remove_portions: result.remove.map(({ f, kind, labels, keep }) => ({ source: f.source, source_id: f.key.slice(f.source.length + 1), name_vi: f.nameVi, kind, remove: labels, keep })),
      renames: result.renames.map(({ f, to }) => ({ source: f.source, source_id: f.key.slice(f.source.length + 1), from: f.nameVi, to })),
    };

    mkdirSync(path.join(ROOT, "docs/data"), { recursive: true });
    writeFileSync(path.join(ROOT, "docs/data/edible-part-scan-2026-10-19.md"), md);
    writeFileSync(path.join(ROOT, "docs/data/edible-part-portions-2026-10-19.json"), `${JSON.stringify(json, null, 2)}\n`);
    expect(result.remove.length).toBeGreaterThan(50);
    expect(webLeft).toEqual([]);
  });
});
