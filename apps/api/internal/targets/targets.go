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

	// VN 2016 targets
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

var rdaBandFrom = []int{10, 12, 15, 18, 20, 30, 50, 70}

func bandOf(age int) int {
	if age <= 0 {
		age = DefaultAge
	}
	at := 0
	for i, from := range rdaBandFrom {
		if age >= from {
			at = i
		}
	}
	return at
}

type rdaRow struct {
	male   [8]float64
	female *[8]float64
}

func (r rdaRow) value(sex string, band int) float64 {
	if sex == "female" && r.female != nil {
		return r.female[band]
	}
	return r.male[band]
}

func singleTarget(val float64) TargetRange {
	return TargetRange{Min: val, Max: val}
}

var (
	rdaCalcium = rdaRow{
		male:   [8]float64{1000, 1000, 1000, 1000, 800, 800, 800, 1000},
		female: &[8]float64{1000, 1000, 1000, 1000, 800, 800, 900, 1000},
	}
	rdaPhosphorus = rdaRow{
		male: [8]float64{1250, 1250, 1250, 1250, 700, 700, 700, 700},
	}
	rdaMagnesium = rdaRow{
		male:   [8]float64{210, 290, 350, 350, 340, 370, 350, 320},
		female: &[8]float64{210, 280, 300, 300, 270, 290, 290, 260},
	}
	rdaIron = rdaRow{
		male:   [8]float64{7.5, 10.2, 11.6, 11.6, 7.9, 7.9, 7.9, 7.3},
		female: &[8]float64{7, 9.3, 19.8, 19.8, 17.4, 17.4, 6.7, 6.3},
	}
	rdaZinc = rdaRow{
		male:   [8]float64{8.6, 9, 10, 10, 10, 10, 10, 9},
		female: &[8]float64{7.2, 8, 8, 8, 8, 8, 8, 7},
	}
	rdaSelenium = rdaRow{
		male:   [8]float64{32, 32, 32, 32, 34, 34, 34, 33},
		female: &[8]float64{26, 26, 26, 26, 26, 26, 26, 25},
	}
	rdaCopper = rdaRow{
		male: [8]float64{0.7, 0.7, 0.89, 0.89, 0.9, 0.9, 0.9, 0.9},
	}
	rdaManganese = rdaRow{
		male:   [8]float64{1.9, 1.9, 2.2, 2.2, 2.3, 2.3, 2.3, 2.3},
		female: &[8]float64{1.6, 1.6, 1.6, 1.6, 1.8, 1.8, 1.8, 1.8},
	}
	rdaPotassium = rdaRow{
		male:   [8]float64{1900, 2400, 2800, 2800, 2500, 2500, 2500, 2500},
		female: &[8]float64{1800, 2200, 2100, 2100, 2000, 2000, 2000, 2000},
	}
	rdaVitaminA = rdaRow{
		male:   [8]float64{600, 800, 900, 850, 850, 900, 850, 800},
		female: &[8]float64{600, 700, 650, 650, 650, 700, 700, 650},
	}
	rdaVitaminD = rdaRow{
		male: [8]float64{15, 15, 15, 15, 15, 15, 20, 20},
	}
	rdaVitaminE = rdaRow{
		male:   [8]float64{5.5, 7.5, 7.5, 6.5, 6.5, 6.5, 6.5, 6.5},
		female: &[8]float64{5.5, 6, 6, 6, 6, 6, 6, 6},
	}
	rdaVitaminK = rdaRow{
		male: [8]float64{120, 150, 160, 150, 150, 150, 150, 150},
	}
	rdaB1 = rdaRow{
		male:   [8]float64{1.2, 1.4, 1.4, 1.4, 1.3, 1.2, 1.2, 1.1},
		female: &[8]float64{1.1, 1.3, 1.2, 1.2, 1.1, 1, 1, 1},
	}
	rdaB2 = rdaRow{
		male:   [8]float64{1.4, 1.6, 1.7, 1.7, 1.5, 1.4, 1.4, 1.3},
		female: &[8]float64{1.3, 1.4, 1.4, 1.4, 1.2, 1.2, 1.2, 1.1},
	}
	rdaB3 = rdaRow{
		male:   [8]float64{12, 12, 16, 16, 16, 16, 16, 16},
		female: &[8]float64{12, 12, 14, 14, 14, 14, 14, 14},
	}
	rdaB5 = rdaRow{
		male: [8]float64{4, 4, 5, 5, 5, 5, 5, 5},
	}
	rdaB6 = rdaRow{
		male:   [8]float64{1, 1.2, 1.3, 1.3, 1.3, 1.3, 1.7, 1.7},
		female: &[8]float64{1, 1.1, 1.2, 1.2, 1.3, 1.3, 1.5, 1.5},
	}
	rdaFolate = rdaRow{
		male:   [8]float64{300, 300, 300, 300, 400, 400, 400, 400},
		female: &[8]float64{300, 400, 400, 400, 400, 400, 400, 400},
	}
	rdaB12 = rdaRow{
		male: [8]float64{1.8, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4},
	}
	rdaVitaminC = rdaRow{
		male: [8]float64{75, 95, 100, 100, 100, 100, 100, 100},
	}
)

func CalculateEnergyTarget(weightKg float64, goal string) TargetRange {
	switch goal {
	case "build":
		return TargetRange{Min: math.Round(weightKg * 35), Max: math.Round(weightKg * 40)}
	case "maintain":
		return TargetRange{Min: math.Round(weightKg * 30), Max: math.Round(weightKg * 35)}
	case "cut":
		return TargetRange{Min: math.Round(weightKg * 25), Max: math.Round(weightKg * 30)}
	case "deep_cut":
		return TargetRange{Min: math.Round(weightKg * 20), Max: math.Round(weightKg * 25)}
	default:
		return TargetRange{Min: math.Round(weightKg * 30), Max: math.Round(weightKg * 35)}
	}
}

func CalculateProteinTarget(weightKg float64) TargetRange {
	return TargetRange{
		Min: math.Round(weightKg * 1.6),
		Max: math.Round(weightKg * 2.2),
	}
}

func CalculateFatTarget(weightKg float64) TargetRange {
	return TargetRange{
		Min: math.Ceil(weightKg * 0.5),
		Max: math.Round(weightKg * 1.0),
	}
}

func CalculateCarbTarget(caloriesMin float64, proteinMid float64, fatMid float64) TargetRange {
	carbGrams := math.Round((caloriesMin - proteinMid*4 - fatMid*9) / 4)
	return TargetRange{
		Min: carbGrams,
		Max: carbGrams,
	}
}

func CalculateSodiumTarget(trainingMinutes int) TargetRange {
	trainingIntervals := float64(trainingMinutes) / 20.0
	saltMin := 4.0 + 1.0*trainingIntervals
	saltMax := 6.0 + 1.5*trainingIntervals

	return TargetRange{
		Min: math.Round((saltMin*393)/10) * 10,
		Max: math.Round((saltMax*393)/10) * 10,
	}
}

func CalculateFiberTarget(caloriesMin float64, sex string) TargetRange {
	rawFiber := math.Round((caloriesMin / 1000) * 14)
	if sex == "male" {
		min := math.Max(30, math.Min(40, rawFiber))
		return TargetRange{Min: min, Max: 40}
	}
	min := math.Max(20, math.Min(30, rawFiber))
	return TargetRange{Min: min, Max: 30}
}

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

	proteinMid := (pro.Min + pro.Max) / 2.0
	fatMid := (profile.WeightKg*0.5 + profile.WeightKg*1.0) / 2.0
	carb := CalculateCarbTarget(cal.Min, proteinMid, fatMid)

	band := bandOf(profile.Age)

	calcium := singleTarget(rdaCalcium.value(profile.Sex, band))
	phos := singleTarget(rdaPhosphorus.value(profile.Sex, band))
	mag := singleTarget(rdaMagnesium.value(profile.Sex, band))

	ironVal := rdaIron.value(profile.Sex, band)
	if profile.Sex == "female" && profile.IsPeriod {
		ironVal = PeriodIronMg
	}
	iron := singleTarget(ironVal)

	zinc := singleTarget(rdaZinc.value(profile.Sex, band))
	sel := singleTarget(rdaSelenium.value(profile.Sex, band))
	cop := singleTarget(rdaCopper.value(profile.Sex, band))
	man := singleTarget(rdaManganese.value(profile.Sex, band))
	pot := singleTarget(rdaPotassium.value(profile.Sex, band))
	vitA := singleTarget(rdaVitaminA.value(profile.Sex, band))
	vitD := singleTarget(rdaVitaminD.value(profile.Sex, band))
	vitE := singleTarget(rdaVitaminE.value(profile.Sex, band))
	vitK := singleTarget(rdaVitaminK.value(profile.Sex, band))
	b1 := singleTarget(rdaB1.value(profile.Sex, band))
	b2 := singleTarget(rdaB2.value(profile.Sex, band))
	b3 := singleTarget(rdaB3.value(profile.Sex, band))
	b5 := singleTarget(rdaB5.value(profile.Sex, band))
	b6 := singleTarget(rdaB6.value(profile.Sex, band))
	fol := singleTarget(rdaFolate.value(profile.Sex, band))
	b12 := singleTarget(rdaB12.value(profile.Sex, band))
	vitC := singleTarget(rdaVitaminC.value(profile.Sex, band))

	sod := CalculateSodiumTarget(profile.TrainingMinutes)
	fiber := CalculateFiberTarget(cal.Min, profile.Sex)
	fastCarbs := CalculateFastCarbsTarget(profile.TrainingMinutes)

	return CompleteTargets{
		Calories:   cal,
		Protein:    pro,
		Fat:        fat,
		Carbs:      carb,
		Fiber:      fiber,
		Sodium:     sod,
		Potassium:  pot,
		Calcium:    calcium,
		Magnesium:  mag,
		Iron:       iron,
		Zinc:       zinc,
		FastCarbs:  fastCarbs,
		B1:         b1,
		B2:         b2,
		B3:         b3,
		B5:         b5,
		B6:         b6,
		B12:        b12,
		Folate:     fol,
		VitaminA:   vitA,
		VitaminC:   vitC,
		VitaminD:   vitD,
		VitaminE:   vitE,
		VitaminK:   vitK,
		Copper:     cop,
		Manganese:  man,
		Phosphorus: phos,
		Selenium:   sel,
	}
}
