import { describe, expect, it } from "vitest";
import { COUNTED_NUTRIENT_KEYS } from "../day-totals";
import { DRI, DRI_STAGE_FROM, DRI_STAGE_LABEL, ageOf, bandOf, driValue, rdaTargets, rdaWho, upperLimits } from "../rda";
import { getNutrientDefinition } from "../nutrients";

// cc-73b. The expected values are the US and Canadian Dietary Reference Intakes (National Academies), read from the DRI
// summary tables as Health Canada publishes them (vitamins; elements; potassium of the 2019 edition), not from lib/rda.

const at = (sex: "male" | "female", age: number) => Object.fromEntries(Object.entries(rdaTargets(sex, age)).map(([k, v]) => [k, v.min]));

describe("the DRI targets", () => {
  it("are the counted micros but sodium (the coach's salt formula stays), each with its unit as the catalogue has it", () => {
    expect(DRI.map((r) => r.id).sort()).toEqual([...COUNTED_NUTRIENT_KEYS].filter((k) => k !== "sodium").sort());
    expect(DRI).toHaveLength(21);
    for (const row of DRI) expect(getNutrientDefinition(row.id)?.unit, row.id).toBeTruthy();
  });

  it("name the DRI table and report of each row", () => {
    for (const row of DRI) {
      expect(["Vitamins", "Elements"], row.id).toContain(row.table);
      expect(row.report, row.id).toBeTruthy();
    }
    expect(DRI.find((r) => r.id === "potassium")?.report).toContain("2019");
    expect(DRI.find((r) => r.id === "vitamin_d")?.report).toContain("2011");
  });

  it("give one value: min and max are the same", () => {
    for (const [id, range] of Object.entries(rdaTargets("female", 31))) expect(range.min, id).toBe(range.max);
  });
});

describe("life stages (9–13, 14–18, 19–30, 31–50, 51–70, 71+)", () => {
  it("an age takes the stage it has reached; a younger one the first", () => {
    expect(DRI_STAGE_FROM).toEqual([9, 14, 19, 31, 51, 71]);
    const label = (age: number) => DRI_STAGE_LABEL[bandOf(age)];
    expect(label(8)).toBe("9–13");
    expect(label(13)).toBe("9–13");
    expect(label(14)).toBe("14–18");
    expect(label(18)).toBe("14–18");
    expect(label(19)).toBe("19–30");
    expect(label(30)).toBe("19–30");
    expect(label(31)).toBe("31–50");
    expect(label(50)).toBe("31–50");
    expect(label(51)).toBe("51–70");
    expect(label(70)).toBe("51–70");
    expect(label(71)).toBe("71+");
    expect(label(104)).toBe("71+");
  });

  it("age is the year less the year of birth, and who a value is for names the stage", () => {
    expect(ageOf(2003, 2026)).toBe(23);
    expect(rdaWho("male", 23)).toBe("Nam 19–30 tuổi");
    expect(rdaWho("female", 31)).toBe("Nữ 31–50 tuổi");
    expect(rdaWho("female", 71)).toBe("Nữ 71+ tuổi");
  });
});

describe("the RDA / AI by sex and age (Dietary Reference Intakes)", () => {
  const youngMale = {
    calcium: 1300, phosphorus: 1250, magnesium: 240, iron: 8, zinc: 8, selenium: 40, copper: 0.7, manganese: 1.9, potassium: 2500,
    vitamin_a: 600, vitamin_d: 15, vitamin_e: 11, vitamin_k: 60, b1: 0.9, b2: 0.9, b3: 12, b5: 4, b6: 1, folate: 300, b12: 1.8, vitamin_c: 45,
  };
  const adultMale = {
    calcium: 1000, phosphorus: 700, magnesium: 400, iron: 8, zinc: 11, selenium: 55, copper: 0.9, manganese: 2.3, potassium: 3400,
    vitamin_a: 900, vitamin_d: 15, vitamin_e: 15, vitamin_k: 120, b1: 1.2, b2: 1.3, b3: 16, b5: 5, b6: 1.3, folate: 400, b12: 2.4, vitamin_c: 90,
  };
  const adultFemale = {
    calcium: 1000, phosphorus: 700, magnesium: 310, iron: 18, zinc: 8, selenium: 55, copper: 0.9, manganese: 1.8, potassium: 2600,
    vitamin_a: 700, vitamin_d: 15, vitamin_e: 15, vitamin_k: 90, b1: 1.1, b2: 1.1, b3: 14, b5: 5, b6: 1.3, folate: 400, b12: 2.4, vitamin_c: 75,
  };

  it("a boy of 11 (9–13)", () => expect(at("male", 11)).toEqual(youngMale));
  it("a girl of 11: as a boy but potassium 2.300 and manganese 1,6", () => expect(at("female", 11)).toEqual({ ...youngMale, potassium: 2300, manganese: 1.6 }));

  it("a boy of 16 (14–18)", () => {
    expect(at("male", 16)).toEqual({
      calcium: 1300, phosphorus: 1250, magnesium: 410, iron: 11, zinc: 11, selenium: 55, copper: 0.89, manganese: 2.2, potassium: 3000,
      vitamin_a: 900, vitamin_d: 15, vitamin_e: 15, vitamin_k: 75, b1: 1.2, b2: 1.3, b3: 16, b5: 5, b6: 1.3, folate: 400, b12: 2.4, vitamin_c: 75,
    });
  });
  it("a girl of 16", () => {
    expect(at("female", 16)).toEqual({
      calcium: 1300, phosphorus: 1250, magnesium: 360, iron: 15, zinc: 9, selenium: 55, copper: 0.89, manganese: 1.6, potassium: 2300,
      vitamin_a: 700, vitamin_d: 15, vitamin_e: 15, vitamin_k: 75, b1: 1, b2: 1, b3: 14, b5: 5, b6: 1.2, folate: 400, b12: 2.4, vitamin_c: 65,
    });
  });

  it("a man of 25 (19–30)", () => expect(at("male", 25)).toEqual(adultMale));
  it("a woman of 25", () => expect(at("female", 25)).toEqual(adultFemale));
  it("a man of 40 (31–50): magnesium 420, the rest as at 25", () => expect(at("male", 40)).toEqual({ ...adultMale, magnesium: 420 }));
  it("a woman of 40: magnesium 320, the rest as at 25", () => expect(at("female", 40)).toEqual({ ...adultFemale, magnesium: 320 }));
  it("a man of 60 (51–70): magnesium 420, B6 1,7", () => expect(at("male", 60)).toEqual({ ...adultMale, magnesium: 420, b6: 1.7 }));
  it("a woman of 60: calcium 1.200, iron 8, magnesium 320, B6 1,5", () => expect(at("female", 60)).toEqual({ ...adultFemale, calcium: 1200, iron: 8, magnesium: 320, b6: 1.5 }));
  it("a man of 75 (71+): calcium 1.200, vitamin D 20, magnesium 420, B6 1,7", () => expect(at("male", 75)).toEqual({ ...adultMale, calcium: 1200, vitamin_d: 20, magnesium: 420, b6: 1.7 }));
  it("a woman of 75: calcium 1.200, iron 8, vitamin D 20, magnesium 320, B6 1,5", () => expect(at("female", 75)).toEqual({ ...adultFemale, calcium: 1200, iron: 8, vitamin_d: 20, magnesium: 320, b6: 1.5 }));

  describe("every edge: 18/19, 30/31, 50/51, 70/71", () => {
    const v = (id: string, sex: "male" | "female", ...ages: number[]) => ages.map((a) => driValue(id, sex, a));
    it("calcium: men 1.000 until 70 then 1.200; women 1.000 until 50 then 1.200", () => {
      expect(v("calcium", "male", 18, 19, 50, 51, 70, 71)).toEqual([1300, 1000, 1000, 1000, 1000, 1200]);
      expect(v("calcium", "female", 18, 19, 50, 51, 70, 71)).toEqual([1300, 1000, 1000, 1200, 1200, 1200]);
    });
    it("magnesium: men 410, 400, 420 from 31; women 360, 310, 320 from 31", () => {
      expect(v("magnesium", "male", 18, 19, 30, 31, 70, 71)).toEqual([410, 400, 400, 420, 420, 420]);
      expect(v("magnesium", "female", 18, 19, 30, 31, 70, 71)).toEqual([360, 310, 310, 320, 320, 320]);
    });
    it("iron: a woman 15, 18 from 19, 8 from 51; a man 11, then 8", () => {
      expect(v("iron", "female", 18, 19, 50, 51)).toEqual([15, 18, 18, 8]);
      expect(v("iron", "male", 18, 19)).toEqual([11, 8]);
    });
    it("B6: men 1,3 then 1,7 from 51; women 1,2, 1,3, then 1,5 from 51", () => {
      expect(v("b6", "male", 18, 19, 50, 51)).toEqual([1.3, 1.3, 1.3, 1.7]);
      expect(v("b6", "female", 18, 19, 50, 51)).toEqual([1.2, 1.3, 1.3, 1.5]);
    });
    it("vitamin D: 15 until 70, 20 from 71", () => expect(v("vitamin_d", "male", 18, 70, 71)).toEqual([15, 15, 20]));
    it("zinc: a girl 9 then a woman 8; a man 11", () => {
      expect(v("zinc", "female", 18, 19)).toEqual([9, 8]);
      expect(v("zinc", "male", 18, 19)).toEqual([11, 11]);
    });
    it("vitamin K and C: men 75 then 120, women 75 then 90; C men 75 then 90, women 65 then 75", () => {
      expect(v("vitamin_k", "male", 18, 19)).toEqual([75, 120]);
      expect(v("vitamin_k", "female", 18, 19)).toEqual([75, 90]);
      expect(v("vitamin_c", "male", 18, 19)).toEqual([75, 90]);
      expect(v("vitamin_c", "female", 18, 19)).toEqual([65, 75]);
    });
    it("potassium (AI, 2019): boys 2.500, 3.000, 3.400; girls 2.300 then 2.600 from 19", () => {
      expect(v("potassium", "male", 13, 14, 18, 19)).toEqual([2500, 3000, 3000, 3400]);
      expect(v("potassium", "female", 13, 14, 18, 19)).toEqual([2300, 2300, 2300, 2600]);
    });
  });
});

describe("the Tolerable Upper Intake Levels", () => {
  const adult = {
    calcium: 2500, phosphorus: 4000, magnesium: 350, iron: 45, zinc: 40, selenium: 400, copper: 10, manganese: 11,
    vitamin_a: 3000, vitamin_d: 100, vitamin_e: 1000, b3: 35, b6: 100, folate: 1000, vitamin_c: 2000,
  };
  const limits = (age: number) => Object.fromEntries(Object.entries(upperLimits(age)).map(([k, v]) => [k, v.limit]));

  it("an adult of 25", () => expect(limits(25)).toEqual(adult));
  it("a child of 11 (9–13)", () => {
    expect(limits(11)).toEqual({
      calcium: 3000, phosphorus: 4000, magnesium: 350, iron: 40, zinc: 23, selenium: 280, copper: 5, manganese: 6,
      vitamin_a: 1700, vitamin_d: 100, vitamin_e: 600, b3: 20, b6: 60, folate: 600, vitamin_c: 1200,
    });
  });
  it("a teenager of 16 (14–18)", () => {
    expect(limits(16)).toEqual({
      calcium: 3000, phosphorus: 4000, magnesium: 350, iron: 45, zinc: 34, selenium: 400, copper: 8, manganese: 9,
      vitamin_a: 2800, vitamin_d: 100, vitamin_e: 800, b3: 30, b6: 80, folate: 800, vitamin_c: 1800,
    });
  });
  it("calcium falls to 2.000 from 51, phosphorus to 3.000 from 71", () => {
    expect(limits(50).calcium).toBe(2500);
    expect(limits(51).calcium).toBe(2000);
    expect(limits(70).phosphorus).toBe(4000);
    expect(limits(71).phosphorus).toBe(3000);
    expect(limits(71).calcium).toBe(2000);
  });
  it("the 18/19 edge: iron 45 both sides, zinc 34 then 40, copper 8 then 10, vitamin C 1.800 then 2.000", () => {
    expect([limits(18).iron, limits(19).iron]).toEqual([45, 45]);
    expect([limits(18).zinc, limits(19).zinc]).toEqual([34, 40]);
    expect([limits(18).copper, limits(19).copper]).toEqual([8, 10]);
    expect([limits(18).vitamin_c, limits(19).vitamin_c]).toEqual([1800, 2000]);
  });
  it("nutrients with no UL have none: potassium, vitamin K, B1, B2, B5, B12", () => {
    for (const id of ["potassium", "vitamin_k", "b1", "b2", "b5", "b12"]) expect(upperLimits(30)[id], id).toBeUndefined();
  });
  it("only magnesium, vitamin E, niacin (B3) and folate count supplements only", () => {
    const only = Object.entries(upperLimits(30)).filter(([, v]) => v.supplementsOnly).map(([k]) => k).sort();
    expect(only).toEqual(["b3", "folate", "magnesium", "vitamin_e"]);
  });
  it("a limit is never under the target it belongs to (magnesium's 350 mg is for supplements only, below an adult's food target)", () => {
    for (const age of [11, 16, 25, 40, 55, 75]) {
      for (const sex of ["male", "female"] as const) {
        for (const [id, ul] of Object.entries(upperLimits(age)).filter(([id]) => id !== "magnesium")) expect(ul.limit, `${id} ${sex} ${age}`).toBeGreaterThan(driValue(id, sex, age) ?? 0);
      }
    }
  });
});
