-- Seeds the 57 nutrients defined in docs/nutrient-catalog.md and apps/web/lib/nutrients.ts
-- 22 counted nutrients correspond to the active targets tracked across general, carbs, lipids, protein, vitamins, minerals.

INSERT INTO nutrition.nutrients (key, name_vi, name_en, unit, counted, group_key, depth, parent_id, target_source, sort) VALUES
-- 1. General
('energy', 'Năng lượng', 'Energy', 'kcal', true, 'general', 0, NULL, 'coach', 1),
('water', 'Nước', 'Water', 'g', false, 'general', 0, NULL, 'none', 2),
('alcohol', 'Cồn', 'Alcohol', 'g', false, 'general', 0, NULL, 'none', 3),
('caffeine', 'Caffeine', 'Caffeine', 'mg', false, 'general', 0, NULL, 'none', 4),
('oxalate', 'Oxalat', 'Oxalate', 'mg', false, 'general', 0, NULL, 'none', 5),
('phytate', 'Phytat', 'Phytate', 'mg', false, 'general', 0, NULL, 'none', 6),

-- 2. Carbohydrates
('carbs', 'Tinh bột tổng', 'Carbs', 'g', true, 'carbs', 0, NULL, 'coach-provisional', 10),
('net_carbs', 'Carb ròng', 'Net carbs', 'g', false, 'carbs', 1, 'carbs', 'none', 11),
('fiber', 'Chất xơ', 'Fiber', 'g', true, 'carbs', 1, 'carbs', 'coach-provisional', 12),
('insoluble_fiber', 'Xơ không tan', 'Insoluble fiber', 'g', false, 'carbs', 2, 'fiber', 'none', 13),
('soluble_fiber', 'Xơ hoà tan', 'Soluble fiber', 'g', false, 'carbs', 2, 'fiber', 'none', 14),
('starch', 'Tinh bột (starch)', 'Starch', 'g', false, 'carbs', 1, 'carbs', 'none', 15),
('sugars', 'Đường', 'Sugars', 'g', false, 'carbs', 1, 'carbs', 'none', 16),
('added_sugars', 'Đường bổ sung', 'Added sugars', 'g', false, 'carbs', 1, 'carbs', 'none', 17),

-- 3. Lipids
('fat', 'Chất béo', 'Fat', 'g', true, 'lipids', 0, NULL, 'coach', 20),
('monounsaturated_fat', 'Béo không bão hoà đơn', 'Monounsaturated', 'g', false, 'lipids', 1, 'fat', 'none', 21),
('polyunsaturated_fat', 'Béo không bão hoà đa', 'Polyunsaturated', 'g', false, 'lipids', 1, 'fat', 'none', 22),
('omega3', 'Omega-3', 'Omega-3', 'g', false, 'lipids', 2, 'polyunsaturated_fat', 'none', 23),
('ala', 'ALA', 'ALA', 'g', false, 'lipids', 3, 'omega3', 'none', 24),
('dha', 'DHA', 'DHA', 'g', false, 'lipids', 3, 'omega3', 'none', 25),
('epa', 'EPA', 'EPA', 'g', false, 'lipids', 3, 'omega3', 'none', 26),
('omega6', 'Omega-6', 'Omega-6', 'g', false, 'lipids', 2, 'polyunsaturated_fat', 'none', 27),
('saturated_fat', 'Béo bão hoà', 'Saturated', 'g', false, 'lipids', 1, 'fat', 'none', 28),
('trans_fat', 'Béo chuyển hoá', 'Trans fat', 'g', false, 'lipids', 1, 'fat', 'none', 29),
('cholesterol', 'Cholesterol', 'Cholesterol', 'mg', false, 'lipids', 0, NULL, 'none', 30),

-- 4. Protein
('protein', 'Đạm', 'Protein', 'g', true, 'protein', 0, NULL, 'coach', 40),
('cystine', 'Cystine', 'Cystine', 'g', false, 'protein', 1, 'protein', 'none', 41),
('histidine', 'Histidine', 'Histidine', 'g', false, 'protein', 1, 'protein', 'none', 42),
('isoleucine', 'Isoleucine', 'Isoleucine', 'g', false, 'protein', 1, 'protein', 'none', 43),
('leucine', 'Leucine', 'Leucine', 'g', false, 'protein', 1, 'protein', 'none', 44),
('lysine', 'Lysine', 'Lysine', 'g', false, 'protein', 1, 'protein', 'none', 45),
('methionine', 'Methionine', 'Methionine', 'g', false, 'protein', 1, 'protein', 'none', 46),
('phenylalanine', 'Phenylalanine', 'Phenylalanine', 'g', false, 'protein', 1, 'protein', 'none', 47),
('threonine', 'Threonine', 'Threonine', 'g', false, 'protein', 1, 'protein', 'none', 48),
('tryptophan', 'Tryptophan', 'Tryptophan', 'g', false, 'protein', 1, 'protein', 'none', 49),
('tyrosine', 'Tyrosine', 'Tyrosine', 'g', false, 'protein', 1, 'protein', 'none', 50),
('valine', 'Valine', 'Valine', 'g', false, 'protein', 1, 'protein', 'none', 51),

-- 5. Vitamins (12 counted)
('b1', 'Vitamin B1', 'B1', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 60),
('b2', 'Vitamin B2', 'B2', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 61),
('b3', 'Vitamin B3', 'B3', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 62),
('b5', 'Vitamin B5', 'B5', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 63),
('b6', 'Vitamin B6', 'B6', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 64),
('b12', 'Vitamin B12', 'B12', 'µg', true, 'vitamins', 0, NULL, 'vn2016', 65),
('folate', 'Vitamin B9', 'Folate', 'µg', true, 'vitamins', 0, NULL, 'vn2016', 66),
('vitamin_a', 'Vitamin A', 'Vitamin A', 'µg', true, 'vitamins', 0, NULL, 'vn2016', 67),
('vitamin_c', 'Vitamin C', 'Vitamin C', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 68),
('vitamin_d', 'Vitamin D', 'Vitamin D', 'µg', true, 'vitamins', 0, NULL, 'vn2016', 69),
('vitamin_e', 'Vitamin E', 'Vitamin E', 'mg', true, 'vitamins', 0, NULL, 'vn2016', 70),
('vitamin_k', 'Vitamin K', 'Vitamin K', 'µg', true, 'vitamins', 0, NULL, 'vn2016', 71),

-- 6. Minerals (6 counted: calcium, iron, magnesium, potassium, sodium, zinc)
('calcium', 'Canxi', 'Calcium', 'mg', true, 'minerals', 0, NULL, 'coach', 80),
('copper', 'Đồng', 'Copper', 'mg', false, 'minerals', 0, NULL, 'vn2016', 81),
('iron', 'Sắt', 'Iron', 'mg', true, 'minerals', 0, NULL, 'coach', 82),
('magnesium', 'Magie', 'Magnesium', 'mg', true, 'minerals', 0, NULL, 'coach', 83),
('manganese', 'Mangan', 'Manganese', 'mg', false, 'minerals', 0, NULL, 'vn2016', 84),
('phosphorus', 'Phốt pho', 'Phosphorus', 'mg', false, 'minerals', 0, NULL, 'vn2016', 85),
('potassium', 'Kali', 'Potassium', 'mg', true, 'minerals', 0, NULL, 'coach', 86),
('selenium', 'Selen', 'Selenium', 'µg', false, 'minerals', 0, NULL, 'vn2016', 87),
('sodium', 'Natri', 'Sodium', 'mg', true, 'minerals', 0, NULL, 'coach', 88),
('zinc', 'Kẽm', 'Zinc', 'mg', true, 'minerals', 0, NULL, 'coach', 89)
ON CONFLICT (key) DO UPDATE SET
    name_vi = EXCLUDED.name_vi,
    name_en = EXCLUDED.name_en,
    unit = EXCLUDED.unit,
    counted = EXCLUDED.counted,
    group_key = EXCLUDED.group_key,
    depth = EXCLUDED.depth,
    parent_id = EXCLUDED.parent_id,
    target_source = EXCLUDED.target_source,
    sort = EXCLUDED.sort;
