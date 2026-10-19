import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import { RDA, RDA_BAND_FROM, RDA_BAND_LABEL, ageOf, bandOf, rdaTargets, rdaWho } from "../rda";
import { getNutrientDefinition } from "../nutrients";

// cc-67 part 4. The expected values are VN 2016 (Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam, QĐ 2615/QĐ-BYT), read from
// its tables, not from lib/rda.

// The choice VN 2016 leaves open, for the review table (not shipped in the app)
const NOTE: Record<string, string> = {
  iron: "khẩu phần hấp thu sắt 15%; nữ 20–49 tuổi là mức có kinh nguyệt, nữ từ 50 tuổi là mức đã mãn kinh",
  zinc: "mức hấp thu vừa",
  copper: "đổi từ µg",
  manganese: "AI",
  sodium: "mục tiêu chế độ ăn, dưới mức này (2.000 mg natri = 5 g muối); mức đủ (AI) là 600 mg",
  potassium: "mức tiêu thụ đủ (AI); mục tiêu chế độ ăn của WHO là trên 3.510 mg",
  vitamin_a: "µg RAE",
  vitamin_e: "AI, alpha-tocopherol",
  vitamin_k: "AI",
  b5: "AI",
  folate: "bảng in 300 cho nam 15–19 tuổi (IOM: 400)",
};

const at = (sex: "male" | "female", age: number) => Object.fromEntries(Object.entries(rdaTargets(sex, age)).map(([k, v]) => [k, v.min]));

describe("the 22 targets", () => {
  it("are exactly the counted micros, each with its unit as the catalogue has it", () => {
    expect(RDA.map((r) => r.id).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].sort());
    expect(RDA).toHaveLength(22);
    for (const row of RDA) expect(getNutrientDefinition(row.id)?.unit, row.id).toBeTruthy();
  });

  it("have a table of VN 2016 each (Bảng 16 to 47), and eight values per sex", () => {
    for (const row of RDA) {
      expect(row.table, row.id).toBeGreaterThanOrEqual(16);
      expect(row.table, row.id).toBeLessThanOrEqual(47);
      expect(row.male).toHaveLength(8);
      expect(row.female ?? row.male).toHaveLength(8);
    }
  });

  it("give one value: min and max are the same", () => {
    for (const [id, range] of Object.entries(rdaTargets("female", 31))) expect(range.min, id).toBe(range.max);
  });
});

describe("age bands (VN 2016: 10–11, 12–14, 15–17, 18–19, 20–29, 30–49, 50–69, 70+)", () => {
  it("an age takes the band it has reached; a younger one the first", () => {
    expect(RDA_BAND_FROM).toEqual([10, 12, 15, 18, 20, 30, 50, 70]);
    expect(RDA_BAND_LABEL[bandOf(19)]).toBe("18–19");
    expect(RDA_BAND_LABEL[bandOf(20)]).toBe("20–29");
    expect(RDA_BAND_LABEL[bandOf(29)]).toBe("20–29");
    expect(RDA_BAND_LABEL[bandOf(30)]).toBe("30–49");
    expect(RDA_BAND_LABEL[bandOf(49)]).toBe("30–49");
    expect(RDA_BAND_LABEL[bandOf(50)]).toBe("50–69");
    expect(RDA_BAND_LABEL[bandOf(70)]).toBe("70+");
    expect(RDA_BAND_LABEL[bandOf(104)]).toBe("70+");
    expect(RDA_BAND_LABEL[bandOf(8)]).toBe("10–11");
  });

  it("age is the year less the year of birth", () => {
    expect(ageOf(2003, 2026)).toBe(23);
    expect(rdaWho("male", 23)).toBe("Nam 20–29 tuổi");
    expect(rdaWho("female", 71)).toBe("Nữ 70+ tuổi");
  });
});

describe("the values, by sex and age (read from the tables of VN 2016)", () => {
  it("a man of 25 (Bảng 16–47)", () => {
    expect(at("male", 25)).toEqual({
      calcium: 800, phosphorus: 700, magnesium: 340, iron: 7.9, zinc: 10, selenium: 34, copper: 0.9, manganese: 2.3, sodium: 2000, potassium: 2500,
      vitamin_a: 850, vitamin_d: 15, vitamin_e: 6.5, vitamin_k: 150, b1: 1.3, b2: 1.5, b3: 16, b5: 5, b6: 1.3, folate: 400, b12: 2.4, vitamin_c: 100,
    });
  });

  it("a woman of 25", () => {
    expect(at("female", 25)).toEqual({
      calcium: 800, phosphorus: 700, magnesium: 270, iron: 17.4, zinc: 8, selenium: 26, copper: 0.9, manganese: 1.8, sodium: 2000, potassium: 2000,
      vitamin_a: 650, vitamin_d: 15, vitamin_e: 6, vitamin_k: 150, b1: 1.1, b2: 1.2, b3: 14, b5: 5, b6: 1.3, folate: 400, b12: 2.4, vitamin_c: 100,
    });
  });

  it("a man of 40 and a woman of 40", () => {
    const m = at("male", 40);
    expect([m.magnesium, m.vitamin_a, m.b1, m.b2]).toEqual([370, 900, 1.2, 1.4]);
    const f = at("female", 40);
    expect([f.magnesium, f.vitamin_a, f.b1, f.b2, f.iron]).toEqual([290, 700, 1, 1.2, 17.4]);
  });

  it("a man and a woman of 55 (calcium, vitamin D, B6 and the iron of the woman change)", () => {
    const m = at("male", 55);
    expect([m.calcium, m.vitamin_d, m.b6, m.iron]).toEqual([800, 20, 1.7, 7.9]);
    const f = at("female", 55);
    expect([f.calcium, f.vitamin_d, f.b6, f.iron]).toEqual([900, 20, 1.5, 6.7]);
  });

  it("a man and a woman of 75", () => {
    const m = at("male", 75);
    expect([m.calcium, m.magnesium, m.zinc, m.selenium, m.vitamin_a, m.iron]).toEqual([1000, 320, 9, 33, 800, 7.3]);
    const f = at("female", 75);
    expect([f.calcium, f.magnesium, f.zinc, f.selenium, f.vitamin_a, f.iron]).toEqual([1000, 260, 7, 25, 650, 6.3]);
  });

  it("a teenager of 16: phosphorus 1.250, calcium 1.000, a girl's iron 19,8", () => {
    expect(at("male", 16)).toMatchObject({ phosphorus: 1250, calcium: 1000, magnesium: 350, vitamin_a: 900, vitamin_k: 160, potassium: 2800 });
    expect(at("female", 16)).toMatchObject({ iron: 19.8, magnesium: 300, vitamin_a: 650, potassium: 2100 });
  });

  it("a child of 11: sodium under 1.900", () => {
    expect(at("male", 11)).toMatchObject({ sodium: 1900, calcium: 1000, vitamin_c: 75, b12: 1.8 });
  });
});

// npm run scan:rda writes the table for the PR (docs/rda-vn2016-targets-2026-10-19.md)
describe("the table for review", () => {
  it.runIf(process.env.RDA_DOC)("writes docs/rda-vn2016-targets-2026-10-19.md", () => {
    const row = (id: string) => RDA.find((r) => r.id === id)!;
    const cell = (v: number) => String(v).replace(".", ",");
    const lines = [
      "# Mục tiêu 22 vi chất theo khuyến nghị (cc-67 phần 4)",
      "",
      "Nguồn chính: Bộ Y tế, Viện Dinh dưỡng, *Nhu cầu dinh dưỡng khuyến nghị cho người Việt Nam*, ban hành kèm Quyết định 2615/QĐ-BYT ngày 16/6/2016 (VN 2016). Số liệu chép đúng như trong bảng: RDA, hoặc AI khi bảng không có RDA. VN 2016 có đủ 22 chất nên không cần lấy từ NIH ODS. App chọn nhóm tuổi theo năm sinh (tuổi = năm nay − năm sinh).",
      "",
      "## Nhóm 20–29 tuổi (nam, nữ)",
      "",
      "| Chất | Đơn vị | Nam | Nữ | Nguồn |",
      "|---|---|---|---|---|",
      ...RDA.map((r) => `| ${getNutrientDefinition(r.id)?.nameEn ?? r.id} | ${getNutrientDefinition(r.id)?.unit} | ${cell(r.male[4])} | ${cell((r.female ?? r.male)[4])} | VN 2016 Bảng ${r.table}${NOTE[r.id] ? `, ${NOTE[r.id]}` : ""} |`),
      "",
      "## Mọi nhóm tuổi",
      "",
      ...RDA.flatMap((r) => [
        `### ${getNutrientDefinition(r.id)?.nameEn ?? r.id} (${getNutrientDefinition(r.id)?.unit}, VN 2016 Bảng ${r.table})`,
        "",
        `| Nhóm tuổi | ${RDA_BAND_LABEL.join(" | ")} |`,
        `|---|${RDA_BAND_LABEL.map(() => "---").join("|")}|`,
        `| Nam | ${r.male.map(cell).join(" | ")} |`,
        `| Nữ | ${(r.female ?? r.male).map(cell).join(" | ")} |`,
        "",
      ]),
      `Giữ nguyên: năng lượng, đạm, béo, tinh bột, chất xơ (công thức của huấn luyện viên). Bỏ: kali theo cân nặng, canxi 1.200–1.500, magie = 50% canxi, natri theo phút tập, sắt theo kỳ kinh.`,
    ];
    const file = path.resolve(__dirname, "../../../../docs/rda-vn2016-targets-2026-10-19.md");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${lines.join("\n")}\n`);
    expect(row("iron").table).toBe(19);
  });
});
