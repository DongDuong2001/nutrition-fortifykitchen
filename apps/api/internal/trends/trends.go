package trends

import (
	"context"
	"math"
	"sort"
	"time"

	"github.com/google/uuid"
	"nutrition-api/internal/targets"
)

var CountedNutrientKeys = []string{
	// 12 vitamins
	"b1", "b2", "b3", "b5", "b6", "folate", "b12",
	"vitamin_a", "vitamin_c", "vitamin_d", "vitamin_e", "vitamin_k",
	// 10 minerals
	"calcium", "copper", "iron", "magnesium", "manganese",
	"phosphorus", "potassium", "selenium", "sodium", "zinc",
}

type NutrientMeta struct {
	NameVi string
	Unit   string
}

var NutrientMetadata = map[string]NutrientMeta{
	"b1":         {NameVi: "Vitamin B1", Unit: "mg"},
	"b2":         {NameVi: "Vitamin B2", Unit: "mg"},
	"b3":         {NameVi: "Vitamin B3", Unit: "mg"},
	"b5":         {NameVi: "Vitamin B5", Unit: "mg"},
	"b6":         {NameVi: "Vitamin B6", Unit: "mg"},
	"folate":     {NameVi: "Vitamin B9", Unit: "µg"},
	"b12":        {NameVi: "Vitamin B12", Unit: "µg"},
	"vitamin_a":  {NameVi: "Vitamin A", Unit: "µg"},
	"vitamin_c":  {NameVi: "Vitamin C", Unit: "mg"},
	"vitamin_d":  {NameVi: "Vitamin D", Unit: "µg"},
	"vitamin_e":  {NameVi: "Vitamin E", Unit: "mg"},
	"vitamin_k":  {NameVi: "Vitamin K", Unit: "µg"},
	"calcium":    {NameVi: "Canxi", Unit: "mg"},
	"copper":     {NameVi: "Đồng", Unit: "mg"},
	"iron":       {NameVi: "Sắt", Unit: "mg"},
	"magnesium":  {NameVi: "Magie", Unit: "mg"},
	"manganese":  {NameVi: "Mangan", Unit: "mg"},
	"phosphorus": {NameVi: "Phốt pho", Unit: "mg"},
	"potassium":  {NameVi: "Kali", Unit: "mg"},
	"selenium":   {NameVi: "Selen", Unit: "µg"},
	"sodium":     {NameVi: "Natri", Unit: "mg"},
	"zinc":       {NameVi: "Kẽm", Unit: "mg"},
}

type TrendDayTotals struct {
	Date      string              `json:"date"`
	Logged    bool                `json:"logged"`
	Calories  *float64            `json:"calories"`
	Protein   *float64            `json:"protein"`
	Carbs     *float64            `json:"carbs"`
	Fat       *float64            `json:"fat"`
	Fiber     *float64            `json:"fiber"`
	Nutrients map[string]*float64 `json:"nutrients"`
}

type PeriodAverages struct {
	LoggedDays int                 `json:"loggedDays"`
	Calories   *float64            `json:"calories"`
	Protein    *float64            `json:"protein"`
	Carbs      *float64            `json:"carbs"`
	Fat        *float64            `json:"fat"`
	Fiber      *float64            `json:"fiber"`
	Nutrients  map[string]*float64 `json:"nutrients"`
}

type TargetCount struct {
	Met int `json:"met"`
	Of  int `json:"of"`
}

type MacroSplit struct {
	Protein int `json:"protein"`
	Carbs   int `json:"carbs"`
	Fat     int `json:"fat"`
}

type PeriodChange struct {
	Key      string  `json:"key"`
	Label    string  `json:"label"`
	Unit     string  `json:"unit"`
	Current  float64 `json:"current"`
	Previous float64 `json:"previous"`
	Delta    float64 `json:"delta"`
	DeltaPct float64 `json:"deltaPct"`
}

type WeightPoint struct {
	Date string  `json:"date"`
	Kg   float64 `json:"kg"`
}

type WeightSummary struct {
	Latest     *float64      `json:"latest"`
	Change     *float64      `json:"change"`
	SinceStart *float64      `json:"sinceStart"`
	StartDate  *string       `json:"startDate"`
	Points     []WeightPoint `json:"points"`
}

type DailyTrendPoint struct {
	Date        string   `json:"date"`
	Logged      bool     `json:"logged"`
	Calories    *float64 `json:"calories"`
	Protein     *float64 `json:"protein"`
	Carbs       *float64 `json:"carbs"`
	Fat         *float64 `json:"fat"`
	Fiber       *float64 `json:"fiber"`
	TrainingDay bool     `json:"training_day"`
}

type NutrientStatusItem struct {
	Key        string   `json:"key"`
	NameVi     string   `json:"name_vi"`
	Unit       string   `json:"unit"`
	Average    *float64 `json:"average"`
	TargetMin  *float64 `json:"target_min"`
	TargetMax  *float64 `json:"target_max"`
	Percentage *int     `json:"percentage"`
	Level      string   `json:"level"`
	Met        int      `json:"met"`
	Of         int      `json:"of"`
}

type FoodContribution struct {
	FoodID   uuid.UUID `json:"food_id"`
	FoodName string    `json:"food_name"`
	Amount   float64   `json:"amount"`
}

type WeightTargetImpact struct {
	CaloriesBefore  float64 `json:"calories_before"`
	CaloriesNow     float64 `json:"calories_now"`
	ProteinBefore   float64 `json:"protein_before"`
	ProteinNow      float64 `json:"protein_now"`
	PotassiumBefore float64 `json:"potassium_before"`
	PotassiumNow    float64 `json:"potassium_now"`
}

type TrendsResponse struct {
	Days             int                           `json:"days"`
	Offset           int                           `json:"offset"`
	StartDate        string                        `json:"start_date"`
	EndDate          string                        `json:"end_date"`
	Averages         PeriodAverages                `json:"averages"`
	PreviousAverages PeriodAverages                `json:"previous_averages"`
	TargetDays       map[string]TargetCount        `json:"target_days"`
	DaysOnTarget     map[string]int                `json:"days_on_target"`
	MacroComposition *MacroSplit                   `json:"macro_composition"`
	Changes          []PeriodChange                `json:"changes"`
	Streak           int                           `json:"streak"`
	Weight           WeightSummary                 `json:"weight"`
	DailySeries      []DailyTrendPoint             `json:"daily_series"`
	NutrientStatus   []NutrientStatusItem          `json:"nutrient_status"`
	TopFoods         map[string][]FoodContribution `json:"top_foods"`
	WeightImpact     *WeightTargetImpact           `json:"weight_impact,omitempty"`
}

type Repository interface {
	GetHistoryDays(ctx context.Context, userID uuid.UUID, startDate string, endDate string) ([]TrendDayTotals, error)
	GetDayTrainingFlags(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string]bool, error)
	GetUserTargets(ctx context.Context, userID uuid.UUID) (*targets.CompleteTargets, string, float64, error)
	GetWeightLogs(ctx context.Context, userID uuid.UUID, upToDate string) ([]WeightPoint, error)
	GetTopFoodsForPeriod(ctx context.Context, userID uuid.UUID, startDate string, endDate string) (map[string][]FoodContribution, error)
	GetStreak(ctx context.Context, userID uuid.UUID, todayIso string) (int, error)
}

type Service interface {
	GetTrends(ctx context.Context, userID uuid.UUID, days int, offset int) (*TrendsResponse, error)
}

type trendsServiceImpl struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &trendsServiceImpl{repo: repo}
}

// ComputeAverageOf calculates unrounded mean of known non-nil values, or nil if none
func ComputeAverageOf(values []*float64) *float64 {
	var sum float64
	count := 0
	for _, v := range values {
		if v != nil {
			sum += *v
			count++
		}
	}
	if count == 0 {
		return nil
	}
	avg := sum / float64(count)
	return &avg
}

// ComputePeriodAverages mirrors apps/web/lib/period.ts periodAverages
func ComputePeriodAverages(days []TrendDayTotals, todayIso string) PeriodAverages {
	var logged []TrendDayTotals
	for _, d := range days {
		if d.Logged && d.Date < todayIso {
			logged = append(logged, d)
		}
	}

	var cals, pros, carbs, fats, fibers []*float64
	for _, d := range logged {
		cals = append(cals, d.Calories)
		pros = append(pros, d.Protein)
		carbs = append(carbs, d.Carbs)
		fats = append(fats, d.Fat)
		fibers = append(fibers, d.Fiber)
	}

	nutrientAvgs := make(map[string]*float64)
	for _, key := range CountedNutrientKeys {
		var keyVals []*float64
		for _, d := range logged {
			if d.Nutrients != nil {
				keyVals = append(keyVals, d.Nutrients[key])
			} else {
				keyVals = append(keyVals, nil)
			}
		}
		nutrientAvgs[key] = ComputeAverageOf(keyVals)
	}

	return PeriodAverages{
		LoggedDays: len(logged),
		Calories:   ComputeAverageOf(cals),
		Protein:    ComputeAverageOf(pros),
		Carbs:      ComputeAverageOf(carbs),
		Fat:        ComputeAverageOf(fats),
		Fiber:      ComputeAverageOf(fibers),
		Nutrients:  nutrientAvgs,
	}
}

func TargetMinFor(key string, t *targets.CompleteTargets) *float64 {
	if t == nil {
		return nil
	}
	var val float64
	switch key {
	case "calories":
		val = t.Calories.Min
	case "protein":
		val = t.Protein.Min
	case "carbs":
		val = t.Carbs.Min
	case "fat":
		val = t.Fat.Min
	case "fiber":
		val = t.Fiber.Min
	case "b1":
		val = t.B1.Min
	case "b2":
		val = t.B2.Min
	case "b3":
		val = t.B3.Min
	case "b5":
		val = t.B5.Min
	case "b6":
		val = t.B6.Min
	case "folate":
		val = t.Folate.Min
	case "b12":
		val = t.B12.Min
	case "vitamin_a":
		val = t.VitaminA.Min
	case "vitamin_c":
		val = t.VitaminC.Min
	case "vitamin_d":
		val = t.VitaminD.Min
	case "vitamin_e":
		val = t.VitaminE.Min
	case "vitamin_k":
		val = t.VitaminK.Min
	case "calcium":
		val = t.Calcium.Min
	case "copper":
		val = t.Copper.Min
	case "iron":
		val = t.Iron.Min
	case "magnesium":
		val = t.Magnesium.Min
	case "manganese":
		val = t.Manganese.Min
	case "phosphorus":
		val = t.Phosphorus.Min
	case "potassium":
		val = t.Potassium.Min
	case "selenium":
		val = t.Selenium.Min
	case "sodium":
		val = t.Sodium.Min
	case "zinc":
		val = t.Zinc.Min
	default:
		return nil
	}
	if val <= 0 {
		return nil
	}
	return &val
}

func TargetMaxFor(key string, t *targets.CompleteTargets) *float64 {
	if t == nil {
		return nil
	}
	var minVal, maxVal float64
	switch key {
	case "calories":
		minVal, maxVal = t.Calories.Min, t.Calories.Max
	case "protein":
		minVal, maxVal = t.Protein.Min, t.Protein.Max
	case "carbs":
		minVal, maxVal = t.Carbs.Min, t.Carbs.Max
	case "fat":
		minVal, maxVal = t.Fat.Min, t.Fat.Max
	case "fiber":
		minVal, maxVal = t.Fiber.Min, t.Fiber.Max
	case "calcium":
		minVal, maxVal = t.Calcium.Min, t.Calcium.Max
	case "potassium":
		minVal, maxVal = t.Potassium.Min, t.Potassium.Max
	case "sodium":
		minVal, maxVal = t.Sodium.Min, t.Sodium.Max
	case "magnesium":
		minVal, maxVal = t.Magnesium.Min, t.Magnesium.Max
	case "iron":
		minVal, maxVal = t.Iron.Min, t.Iron.Max
	case "zinc":
		minVal, maxVal = t.Zinc.Min, t.Zinc.Max
	}
	if maxVal > minVal {
		return &maxVal
	}
	return nil
}

func ComputeCountDays(values []*float64, min *float64) TargetCount {
	if min == nil || *min <= 0 {
		return TargetCount{Met: 0, Of: 0}
	}
	known := 0
	met := 0
	for _, v := range values {
		if v != nil {
			known++
			if *v >= *min {
				met++
			}
		}
	}
	return TargetCount{Met: met, Of: known}
}

// ComputePeriodTargetDays mirrors apps/web/lib/period.ts periodTargetDays
func ComputePeriodTargetDays(days []TrendDayTotals, todayIso string, targets *targets.CompleteTargets) map[string]TargetCount {
	var logged []TrendDayTotals
	for _, d := range days {
		if d.Logged && d.Date < todayIso {
			logged = append(logged, d)
		}
	}

	res := make(map[string]TargetCount)
	var cals, pros []*float64
	for _, d := range logged {
		cals = append(cals, d.Calories)
		pros = append(pros, d.Protein)
	}

	res["calories"] = ComputeCountDays(cals, TargetMinFor("calories", targets))
	res["protein"] = ComputeCountDays(pros, TargetMinFor("protein", targets))

	for _, key := range CountedNutrientKeys {
		var keyVals []*float64
		for _, d := range logged {
			if d.Nutrients != nil {
				keyVals = append(keyVals, d.Nutrients[key])
			} else {
				keyVals = append(keyVals, nil)
			}
		}
		res[key] = ComputeCountDays(keyVals, TargetMinFor(key, targets))
	}

	return res
}

// ComputeMacroComposition mirrors apps/web/lib/period.ts macroComposition
func ComputeMacroComposition(protein, carbs, fat *float64) *MacroSplit {
	if protein == nil || carbs == nil || fat == nil {
		return nil
	}
	pCal := *protein * 4
	cCal := *carbs * 4
	fCal := *fat * 9
	total := pCal + cCal + fCal
	if total <= 0 {
		return nil
	}

	kcal := []float64{pCal, cCal, fCal}
	floors := make([]int, 3)
	rests := make([]float64, 3)
	sumFloors := 0
	for i, k := range kcal {
		exact := (k / total) * 100.0
		floors[i] = int(math.Floor(exact))
		rests[i] = exact - float64(floors[i])
		sumFloors += floors[i]
	}

	left := 100 - sumFloors
	type item struct {
		index int
		rest  float64
	}
	order := []item{
		{0, rests[0]},
		{1, rests[1]},
		{2, rests[2]},
	}
	sort.SliceStable(order, func(i, j int) bool {
		if math.Abs(order[i].rest-order[j].rest) > 1e-9 {
			return order[i].rest > order[j].rest
		}
		return order[i].index < order[j].index
	})

	for _, it := range order {
		if left <= 0 {
			break
		}
		floors[it.index]++
		left--
	}

	return &MacroSplit{
		Protein: floors[0],
		Carbs:   floors[1],
		Fat:     floors[2],
	}
}

// ComputeComparePeriods mirrors apps/web/lib/period.ts comparePeriods
func ComputeComparePeriods(current PeriodAverages, previous PeriodAverages) []PeriodChange {
	type metricDef struct {
		key    string
		label  string
		unit   string
		now    *float64
		before *float64
	}

	metrics := []metricDef{
		{key: "calories", label: "Năng lượng", unit: "kcal", now: current.Calories, before: previous.Calories},
		{key: "protein", label: "Đạm", unit: "g", now: current.Protein, before: previous.Protein},
		{key: "carbs", label: "Tinh bột", unit: "g", now: current.Carbs, before: previous.Carbs},
		{key: "fat", label: "Chất béo", unit: "g", now: current.Fat, before: previous.Fat},
	}

	for _, key := range CountedNutrientKeys {
		meta := NutrientMetadata[key]
		var nowVal, beforeVal *float64
		if current.Nutrients != nil {
			nowVal = current.Nutrients[key]
		}
		if previous.Nutrients != nil {
			beforeVal = previous.Nutrients[key]
		}
		metrics = append(metrics, metricDef{
			key:    key,
			label:  meta.NameVi,
			unit:   meta.Unit,
			now:    nowVal,
			before: beforeVal,
		})
	}

	var changes []PeriodChange
	for _, m := range metrics {
		if m.now == nil || m.before == nil || *m.before <= 0 {
			continue
		}
		delta := *m.now - *m.before
		if delta == 0 {
			continue
		}
		deltaPct := (delta * 100.0) / *m.before
		changes = append(changes, PeriodChange{
			Key:      m.key,
			Label:    m.label,
			Unit:     m.unit,
			Current:  *m.now,
			Previous: *m.before,
			Delta:    delta,
			DeltaPct: deltaPct,
		})
	}

	sort.SliceStable(changes, func(i, j int) bool {
		return math.Abs(changes[i].DeltaPct) > math.Abs(changes[j].DeltaPct)
	})

	return changes
}

// ComputeWeightSummary mirrors apps/web/lib/period.ts weightSummary
func ComputeWeightSummary(log []WeightPoint, startDate, endDate string) WeightSummary {
	var upToEnd []WeightPoint
	for _, p := range log {
		if p.Date <= endDate {
			upToEnd = append(upToEnd, p)
		}
	}

	sort.SliceStable(upToEnd, func(i, j int) bool {
		return upToEnd[i].Date < upToEnd[j].Date
	})

	if len(upToEnd) == 0 {
		return WeightSummary{
			Latest:     nil,
			Change:     nil,
			SinceStart: nil,
			StartDate:  nil,
			Points:     []WeightPoint{},
		}
	}

	var points []WeightPoint
	for _, p := range upToEnd {
		if p.Date >= startDate {
			points = append(points, p)
		}
	}

	first := upToEnd[0]
	latest := upToEnd[len(upToEnd)-1]

	var changeVal, sinceStartVal *float64
	if len(points) >= 2 {
		c := points[len(points)-1].Kg - points[0].Kg
		changeVal = &c
	}
	if len(upToEnd) >= 2 {
		s := latest.Kg - first.Kg
		sinceStartVal = &s
	}

	sDate := first.Date
	return WeightSummary{
		Latest:     &latest.Kg,
		Change:     changeVal,
		SinceStart: sinceStartVal,
		StartDate:  &sDate,
		Points:     points,
	}
}

func GetLevel(pct float64) string {
	if pct < 50 {
		return "thieu"
	}
	if pct < 80 {
		return "trungbinh"
	}
	if pct < 100 {
		return "ganDu"
	}
	return "dat"
}

func (s *trendsServiceImpl) GetTrends(ctx context.Context, userID uuid.UUID, days int, offset int) (*TrendsResponse, error) {
	if days != 30 {
		days = 7
	}
	if offset < 0 {
		offset = 0
	}

	loc, _ := time.LoadLocation("Asia/Ho_Chi_Minh")
	if loc == nil {
		loc = time.FixedZone("ICT", 7*3600)
	}
	now := time.Now().In(loc)
	todayIso := now.Format("2006-01-02")

	// Current period dates
	endT := now.AddDate(0, 0, -offset*days)
	startT := endT.AddDate(0, 0, -(days - 1))
	startDate := startT.Format("2006-01-02")
	endDate := endT.Format("2006-01-02")

	// Previous period dates
	prevEndT := endT.AddDate(0, 0, -days)
	prevStartT := prevEndT.AddDate(0, 0, -(days - 1))
	prevStartDate := prevStartT.Format("2006-01-02")
	prevEndDate := prevEndT.Format("2006-01-02")

	// Query history days for both periods
	curDayList, err := s.repo.GetHistoryDays(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	prevDayList, _ := s.repo.GetHistoryDays(ctx, userID, prevStartDate, prevEndDate)

	trainingFlags, _ := s.repo.GetDayTrainingFlags(ctx, userID, startDate, endDate)
	userTargets, goal, currentWeight, _ := s.repo.GetUserTargets(ctx, userID)
	weightPoints, _ := s.repo.GetWeightLogs(ctx, userID, endDate)
	topFoods, _ := s.repo.GetTopFoodsForPeriod(ctx, userID, startDate, endDate)
	streak, _ := s.repo.GetStreak(ctx, userID, todayIso)

	curAverages := ComputePeriodAverages(curDayList, todayIso)
	prevAverages := ComputePeriodAverages(prevDayList, todayIso)

	targetDays := ComputePeriodTargetDays(curDayList, todayIso, userTargets)

	daysOnTargetLegacy := make(map[string]int)
	if td, ok := targetDays["calories"]; ok {
		daysOnTargetLegacy["calories"] = td.Met
	}
	if td, ok := targetDays["protein"]; ok {
		daysOnTargetLegacy["protein"] = td.Met
	}
	if td, ok := targetDays["fiber"]; ok {
		daysOnTargetLegacy["fiber"] = td.Met
	}

	macroSplit := ComputeMacroComposition(curAverages.Protein, curAverages.Carbs, curAverages.Fat)
	changes := ComputeComparePeriods(curAverages, prevAverages)
	weightSummary := ComputeWeightSummary(weightPoints, startDate, endDate)

	// Daily series for UI chart
	var dailySeries []DailyTrendPoint
	for _, d := range curDayList {
		dailySeries = append(dailySeries, DailyTrendPoint{
			Date:        d.Date,
			Logged:      d.Logged,
			Calories:    d.Calories,
			Protein:     d.Protein,
			Carbs:       d.Carbs,
			Fat:         d.Fat,
			Fiber:       d.Fiber,
			TrainingDay: trainingFlags[d.Date],
		})
	}

	// 22-nutrient status items sorted lowest % first
	var nutrientStatus []NutrientStatusItem
	for _, key := range CountedNutrientKeys {
		meta := NutrientMetadata[key]
		avg := curAverages.Nutrients[key]
		tMin := TargetMinFor(key, userTargets)
		tMax := TargetMaxFor(key, userTargets)
		var pct *int
		level := "thieu"
		if avg != nil && tMin != nil && *tMin > 0 {
			p := int(math.Round((*avg / *tMin) * 100))
			pct = &p
			level = GetLevel(float64(p))
		}
		tCount := targetDays[key]
		nutrientStatus = append(nutrientStatus, NutrientStatusItem{
			Key:        key,
			NameVi:     meta.NameVi,
			Unit:       meta.Unit,
			Average:    avg,
			TargetMin:  tMin,
			TargetMax:  tMax,
			Percentage: pct,
			Level:      level,
			Met:        tCount.Met,
			Of:         tCount.Of,
		})
	}

	sort.SliceStable(nutrientStatus, func(i, j int) bool {
		if nutrientStatus[i].Percentage == nil && nutrientStatus[j].Percentage == nil {
			return false
		}
		if nutrientStatus[i].Percentage == nil {
			return false
		}
		if nutrientStatus[j].Percentage == nil {
			return true
		}
		return *nutrientStatus[i].Percentage < *nutrientStatus[j].Percentage
	})

	// Weight change target impact
	var weightImpact *WeightTargetImpact
	if weightSummary.Change != nil && len(weightSummary.Points) >= 2 {
		firstW := weightSummary.Points[0].Kg
		latestW := weightSummary.Points[len(weightSummary.Points)-1].Kg
		calFactor := 30.0
		switch goal {
		case "build":
			calFactor = 35.0
		case "cut":
			calFactor = 25.0
		case "deep_cut":
			calFactor = 20.0
		}
		weightImpact = &WeightTargetImpact{
			CaloriesBefore:  math.Round(firstW * calFactor),
			CaloriesNow:     math.Round(latestW * calFactor),
			ProteinBefore:   math.Round(firstW * 1.6),
			ProteinNow:      math.Round(latestW * 1.6),
			PotassiumBefore: math.Round(firstW * 80),
			PotassiumNow:    math.Round(latestW * 80),
		}
	} else if currentWeight > 0 {
		calFactor := 30.0
		switch goal {
		case "build":
			calFactor = 35.0
		case "cut":
			calFactor = 25.0
		case "deep_cut":
			calFactor = 20.0
		}
		weightImpact = &WeightTargetImpact{
			CaloriesBefore:  math.Round(currentWeight * calFactor),
			CaloriesNow:     math.Round(currentWeight * calFactor),
			ProteinBefore:   math.Round(currentWeight * 1.6),
			ProteinNow:      math.Round(currentWeight * 1.6),
			PotassiumBefore: math.Round(currentWeight * 80),
			PotassiumNow:    math.Round(currentWeight * 80),
		}
	}

	return &TrendsResponse{
		Days:             days,
		Offset:           offset,
		StartDate:        startDate,
		EndDate:          endDate,
		Averages:         curAverages,
		PreviousAverages: prevAverages,
		TargetDays:       targetDays,
		DaysOnTarget:     daysOnTargetLegacy,
		MacroComposition: macroSplit,
		Changes:          changes,
		Streak:           streak,
		Weight:           weightSummary,
		DailySeries:      dailySeries,
		NutrientStatus:   nutrientStatus,
		TopFoods:         topFoods,
		WeightImpact:     weightImpact,
	}, nil
}
