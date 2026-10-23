-- Brer Rabbit Full Flavor (the old "Mật mía Rabbit"): its values are now the label's, so its source moves from
-- usda_sr_legacy / FDC 168820:mat-mia-rabbit-song to label, with the same source_id as in molasses-2026-10-23.json.
-- Run this BEFORE the import: the import upserts on (source, source_id), so without it the Full Flavor record would
-- insert a second row instead of updating this one.
-- As committed it ends in ROLLBACK (look at the two SELECTs: the second must show source = label); to apply it, run
-- it again with the last line changed to COMMIT.
\set ON_ERROR_STOP on

BEGIN;

SELECT id, name_vi, source, source_id FROM nutrition.foods WHERE id = '6598c0aa-06bb-42e3-a00d-37a248a6360a';

UPDATE nutrition.foods
SET source = 'label',
    source_id = 'Brer Rabbit Full Flavor Molasses label, bgfoods.com (archive 2025-11-16), read 2026-10-23'
WHERE id = '6598c0aa-06bb-42e3-a00d-37a248a6360a' AND source = 'usda_sr_legacy';

SELECT id, name_vi, source, source_id FROM nutrition.foods WHERE id = '6598c0aa-06bb-42e3-a00d-37a248a6360a';

ROLLBACK;
