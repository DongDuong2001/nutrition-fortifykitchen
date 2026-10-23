package targets

import (
	"math"
)

type TargetRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

type UserProfileForTargets struct {
	Sex             string  `json:"sex"`
	WeightKg        float64 `json:"weightKg"`
	Goal            string  `json:"goal"`
	TrainingMinutes int     `json:"trainingMinutes"`
	IsPeriod        bool    `json:"isPeriod"`
	Age             int     `json:"age"`
}

type CompleteTargets struct {
	Calories  TargetRange `json:"calories"`
	Protein   TargetRange `json:"protein"`
	Fat       TargetRange `json:"fat"`
	Carbs     TargetRange `json:"carbs"`
	Fiber     TargetRange `json:"fiber"`
	Sodium    TargetRange `json:"sodium"`
	Potassium TargetRange `json:"potassium"`
	Calcium   TargetRange `json:"calcium"`
	Magnesium TargetRange `json:"magnesium"`
	Iron      TargetRange `json:"iron"`
	Zinc      TargetRange `json:"zinc"`
	FastCarbs TargetRange `json:"fastCarbs"`

	// US DRI targets (RDA, or AI where there is no RDA), by sex and age
	B1         TargetRange `json:"b1"`
	B2         TargetRange `json:"b2"`
	B3         TargetRange `json:"b3"`
	B5         TargetRange `json:"b5"`
	B6         TargetRange `json:"b6"`
	B12        TargetRange `json:"b12"`
	Folate     TargetRange `json:"folate"`
	VitaminA   TargetRange `json:"vitamin_a"`
	VitaminC   TargetRange `json:"vitamin_c"`
	VitaminD   TargetRange `json:"vitamin_d"`
	VitaminE   TargetRange `json:"vitamin_e"`
	VitaminK   TargetRange `json:"vitamin_k"`
	Copper     TargetRange `json:"copper"`
	Manganese  TargetRange `json:"manganese"`
	Phosphorus TargetRange `json:"phosphorus"`
	Selenium   TargetRange `json:"selenium"`
}

const (
	DefaultAge   = 25
	PeriodIronMg = 28.0
)

// A step is "from this age on, this value". The life stages are the DRI's own: 9-13, 14-18, 19-30, 31-50, 51-70, 71+.
// A younger age takes the first step.
type step struct {
	from  int
	value float64
}

func at(steps []step, age int) float64 {
	if age <= 0 {
		age = DefaultAge
	}
	v := steps[0].value
	for _, s := range steps {
		if age >= s.from {
			v = s.value
		}
	}
	return v
}

type driRow struct {
	male   []step
	female []step // nil: the same as male
	ul     []step // nil: no UL was set
	// supplementsOnly: the UL covers supplements and fortified foods, not ordinary food
	supplementsOnly bool
}

func (r driRow) value(sex string, age int) float64 {
	if sex == "female" && r.female != nil {
		return at(r.female, age)
	}
	return at(r.male, age)
}

func singleTarget(val float64) TargetRange {
	return TargetRange{Min: val, Max: val}
}

// Source: the DRI summary tables of the National Academies as Health Canada publishes them (vitamins; elements), potassium
// of the 2019 edition. The same numbers as apps/web/lib/rda.ts; docs/dri-targets-2026-10-20.md has the table.
var dri = map[string]driRow{
	"calcium":    {male: []step{{9, 1300}, {19, 1000}, {71, 1200}}, female: []step{{9, 1300}, {19, 1000}, {51, 1200}}, ul: []step{{9, 3000}, {19, 2500}, {51, 2000}}},
	"phosphorus": {male: []step{{9, 1250}, {19, 700}}, ul: []step{{9, 4000}, {71, 3000}}},
	"magnesium":  {male: []step{{9, 240}, {14, 410}, {19, 400}, {31, 420}}, female: []step{{9, 240}, {14, 360}, {19, 310}, {31, 320}}, ul: []step{{9, 350}}, supplementsOnly: true},
	"iron":       {male: []step{{9, 8}, {14, 11}, {19, 8}}, female: []step{{9, 8}, {14, 15}, {19, 18}, {51, 8}}, ul: []step{{9, 40}, {14, 45}}},
	"zinc":       {male: []step{{9, 8}, {14, 11}}, female: []step{{9, 8}, {14, 9}, {19, 8}}, ul: []step{{9, 23}, {14, 34}, {19, 40}}},
	"selenium":   {male: []step{{9, 40}, {14, 55}}, ul: []step{{9, 280}, {14, 400}}},
	"copper":     {male: []step{{9, 0.7}, {14, 0.89}, {19, 0.9}}, ul: []step{{9, 5}, {14, 8}, {19, 10}}},
	"manganese":  {male: []step{{9, 1.9}, {14, 2.2}, {19, 2.3}}, female: []step{{9, 1.6}, {19, 1.8}}, ul: []step{{9, 6}, {14, 9}, {19, 11}}},
	"potassium":  {male: []step{{9, 2500}, {14, 3000}, {19, 3400}}, female: []step{{9, 2300}, {19, 2600}}},
	"vitamin_a":  {male: []step{{9, 600}, {14, 900}}, female: []step{{9, 600}, {14, 700}}, ul: []step{{9, 1700}, {14, 2800}, {19, 3000}}, supplementsOnly: true},
	"vitamin_d":  {male: []step{{9, 15}, {71, 20}}, ul: []step{{9, 100}}},
	"vitamin_e":  {male: []step{{9, 11}, {14, 15}}, ul: []step{{9, 600}, {14, 800}, {19, 1000}}, supplementsOnly: true},
	"vitamin_k":  {male: []step{{9, 60}, {14, 75}, {19, 120}}, female: []step{{9, 60}, {14, 75}, {19, 90}}},
	"b1":         {male: []step{{9, 0.9}, {14, 1.2}}, female: []step{{9, 0.9}, {14, 1}, {19, 1.1}}},
	"b2":         {male: []step{{9, 0.9}, {14, 1.3}}, female: []step{{9, 0.9}, {14, 1}, {19, 1.1}}},
	"b3":         {male: []step{{9, 12}, {14, 16}}, female: []step{{9, 12}, {14, 14}}, ul: []step{{9, 20}, {14, 30}, {19, 35}}, supplementsOnly: true},
	"b5":         {male: []step{{9, 4}, {14, 5}}},
	"b6":         {male: []step{{9, 1}, {14, 1.3}, {51, 1.7}}, female: []step{{9, 1}, {14, 1.2}, {19, 1.3}, {51, 1.5}}, ul: []step{{9, 60}, {14, 80}, {19, 100}}},
	"folate":     {male: []step{{9, 300}, {14, 400}}, ul: []step{{9, 600}, {14, 800}, {19, 1000}}, supplementsOnly: true},
	"b12":        {male: []step{{9, 1.8}, {14, 2.4}}},
	"vitamin_c":  {male: []step{{9, 45}, {14, 75}, {19, 90}}, female: []step{{9, 45}, {14, 65}, {19, 75}}, ul: []step{{9, 1200}, {14, 1800}, {19, 2000}}},
}

// UpperLimit is a Tolerable Upper Intake Level and whether only supplements count against it.
type UpperLimit struct {
	Limit           float64 `json:"limit"`
	SupplementsOnly bool    `json:"supplementsOnly"`
}

// UpperLimitFor is the UL of a nutrient id at an age; ok is false when the nutrient has none.
func UpperLimitFor(id string, age int) (UpperLimit, bool) {
	row, found := dri[id]
	if !found || row.ul == nil {
		return UpperLimit{}, false
	}
	return UpperLimit{Limit: at(row.ul, age), SupplementsOnly: row.supplementsOnly}, true
}

func rda(id, sex string, age int) TargetRange {
	return singleTarget(dri[id].value(sex, age))
}

// Kcal per kg, the upper end of the coach's range (Hao 20/10): one number.
func CalculateEnergyTarget(weightKg float64, goal string) TargetRange {
	perKg := 35.0
	switch goal {
	case "build":
		perKg = 40
	case "cut":
		perKg = 30
	case "deep_cut":
		perKg = 25
	}
	return singleTarget(math.Round(weightKg * perKg))
}

// 2.2 g/kg, the upper end of 1.6-2.2.
func CalculateProteinTarget(weightKg float64) TargetRange {
	return singleTarget(math.Round(weightKg * 2.2))
}

// 1.0 g/kg, the upper end of 0.5-1.0.
func CalculateFatTarget(weightKg float64) TargetRange {
	return singleTarget(math.Round(weightKg * 1.0))
}

// The remainder: (energy - protein*4 - fat*9) / 4, from the upper protein and fat.
func CalculateCarbTarget(energyKcal float64, proteinGrams float64, fatGrams float64) TargetRange {
	return singleTarget(math.Round((energyKcal - proteinGrams*4 - fatGrams*9) / 4))
}

// Salt stays a range and the coach's formula (Hao 20/10).
func CalculateSodiumTarget(trainingMinutes int) TargetRange {
	trainingIntervals := float64(trainingMinutes) / 20.0
	saltMin := 4.0 + 1.0*trainingIntervals
	saltMax := 6.0 + 1.5*trainingIntervals

	return TargetRange{
		Min: math.Round((saltMin*393)/10) * 10,
		Max: math.Round((saltMax*393)/10) * 10,
	}
}

// 14 g per 1,000 kcal of the day's energy, at most 40 g for men and 30 g for women.
func CalculateFiberTarget(energyKcal float64, sex string) TargetRange {
	capG := 30.0
	if sex == "male" {
		capG = 40
	}
	return singleTarget(math.Min(capG, math.Round((energyKcal/1000)*14)))
}

// Fast carbs stay a range (Hao 20/10).
func CalculateFastCarbsTarget(trainingMinutes int) TargetRange {
	if trainingMinutes <= 0 {
		return TargetRange{Min: 0, Max: 0}
	}
	return TargetRange{
		Min: math.Round((30 * float64(trainingMinutes)) / 60),
		Max: math.Round((45 * float64(trainingMinutes)) / 60),
	}
}

func CalculateTargets(profile UserProfileForTargets) CompleteTargets {
	cal := CalculateEnergyTarget(profile.WeightKg, profile.Goal)
	pro := CalculateProteinTarget(profile.WeightKg)
	fat := CalculateFatTarget(profile.WeightKg)
	carb := CalculateCarbTarget(cal.Min, pro.Min, fat.Min)

	iron := rda("iron", profile.Sex, profile.Age)
	if profile.Sex == "female" && profile.IsPeriod {
		iron = singleTarget(PeriodIronMg)
	}

	return CompleteTargets{
		Calories:   cal,
		Protein:    pro,
		Fat:        fat,
		Carbs:      carb,
		Fiber:      CalculateFiberTarget(cal.Min, profile.Sex),
		Sodium:     CalculateSodiumTarget(profile.TrainingMinutes),
		Potassium:  rda("potassium", profile.Sex, profile.Age),
		Calcium:    rda("calcium", profile.Sex, profile.Age),
		Magnesium:  rda("magnesium", profile.Sex, profile.Age),
		Iron:       iron,
		Zinc:       rda("zinc", profile.Sex, profile.Age),
		FastCarbs:  CalculateFastCarbsTarget(profile.TrainingMinutes),
		B1:         rda("b1", profile.Sex, profile.Age),
		B2:         rda("b2", profile.Sex, profile.Age),
		B3:         rda("b3", profile.Sex, profile.Age),
		B5:         rda("b5", profile.Sex, profile.Age),
		B6:         rda("b6", profile.Sex, profile.Age),
		B12:        rda("b12", profile.Sex, profile.Age),
		Folate:     rda("folate", profile.Sex, profile.Age),
		VitaminA:   rda("vitamin_a", profile.Sex, profile.Age),
		VitaminC:   rda("vitamin_c", profile.Sex, profile.Age),
		VitaminD:   rda("vitamin_d", profile.Sex, profile.Age),
		VitaminE:   rda("vitamin_e", profile.Sex, profile.Age),
		VitaminK:   rda("vitamin_k", profile.Sex, profile.Age),
		Copper:     rda("copper", profile.Sex, profile.Age),
		Manganese:  rda("manganese", profile.Sex, profile.Age),
		Phosphorus: rda("phosphorus", profile.Sex, profile.Age),
		Selenium:   rda("selenium", profile.Sex, profile.Age),
	}
}

// ValidTrainingMinutes is the training time a day or a profile default may hold: 0 (rest), the 45-minute preset, or a multiple of
// 30 from 30 to 480 (Tùy chỉnh). Every value the presets give (0, 45, 60, 90, 120, 240) passes; the database checks the same rule
// (migration 000018).
func ValidTrainingMinutes(m int) bool {
	return m == 45 || (m >= 0 && m <= 480 && m%30 == 0)
}
