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

func CalculatePotassiumTarget(weightKg float64) TargetRange {
	return TargetRange{
		Min: math.Round((weightKg*80)/10) * 10,
		Max: math.Round((weightKg*100)/10) * 10,
	}
}

func CalculateCalciumTarget() TargetRange {
	return TargetRange{Min: 1200, Max: 1500}
}

func CalculateMagnesiumTarget(calcium TargetRange) TargetRange {
	return TargetRange{
		Min: math.Round(calcium.Min * 0.5),
		Max: math.Round(calcium.Max * 0.5),
	}
}

func CalculateIronTarget(sex string, isPeriod bool) TargetRange {
	if sex == "female" {
		val := 18.0
		if isPeriod {
			val = 28.0
		}
		return TargetRange{Min: val, Max: val}
	}
	return TargetRange{Min: 8, Max: 8}
}

func CalculateZincTarget(sex string) TargetRange {
	val := 8.0
	if sex == "male" {
		val = 12.0
	}
	return TargetRange{Min: val, Max: val}
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

	calcium := CalculateCalciumTarget()
	mag := CalculateMagnesiumTarget(calcium)
	sod := CalculateSodiumTarget(profile.TrainingMinutes)
	pot := CalculatePotassiumTarget(profile.WeightKg)
	iron := CalculateIronTarget(profile.Sex, profile.IsPeriod)
	zinc := CalculateZincTarget(profile.Sex)
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
		B1:         TargetRange{Min: 1.2, Max: 1.2},
		B2:         TargetRange{Min: 1.3, Max: 1.3},
		B3:         TargetRange{Min: 16, Max: 16},
		B5:         TargetRange{Min: 5, Max: 5},
		B6:         TargetRange{Min: 1.3, Max: 1.3},
		B12:        TargetRange{Min: 2.4, Max: 2.4},
		Folate:     TargetRange{Min: 400, Max: 400},
		VitaminA:   TargetRange{Min: 650, Max: 650},
		VitaminC:   TargetRange{Min: 100, Max: 100},
		VitaminD:   TargetRange{Min: 15, Max: 15},
		VitaminE:   TargetRange{Min: 6.5, Max: 6.5},
		VitaminK:   TargetRange{Min: 150, Max: 150},
		Copper:     TargetRange{Min: 0.9, Max: 0.9},
		Manganese:  TargetRange{Min: 2.3, Max: 2.3},
		Phosphorus: TargetRange{Min: 700, Max: 700},
		Selenium:   TargetRange{Min: 34, Max: 34},
	}
}
