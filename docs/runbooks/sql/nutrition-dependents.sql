-- Objects OUTSIDE the nutrition schema that `DROP SCHEMA nutrition CASCADE` would drop or break (docs/runbooks/migrate-1023.md,
-- "Restore the backup"). One row per object. No rows: nothing outside depends on the schema. Any row: stop and tell Hao.
WITH nutrition_objects AS (
  SELECT 'pg_class'::regclass AS classid, oid AS objid FROM pg_class WHERE relnamespace = 'nutrition'::regnamespace
  UNION ALL SELECT 'pg_proc'::regclass, oid FROM pg_proc WHERE pronamespace = 'nutrition'::regnamespace
  UNION ALL SELECT 'pg_type'::regclass, oid FROM pg_type WHERE typnamespace = 'nutrition'::regnamespace
  UNION ALL SELECT 'pg_namespace'::regclass, 'nutrition'::regnamespace::oid
)
-- 1. Tracked dependencies: views (their rules), triggers, foreign keys, policies, defaults, functions on nutrition types.
--    A dependent's schema is the one of the table it belongs to (a default, policy, trigger or rule has none of its own).
, dependents AS (
  SELECT d.*, CASE d.classid
      WHEN 'pg_class'::regclass      THEN (SELECT relnamespace FROM pg_class WHERE oid = d.objid)
      WHEN 'pg_proc'::regclass       THEN (SELECT pronamespace FROM pg_proc WHERE oid = d.objid)
      WHEN 'pg_type'::regclass       THEN (SELECT typnamespace FROM pg_type WHERE oid = d.objid)
      WHEN 'pg_constraint'::regclass THEN (SELECT connamespace FROM pg_constraint WHERE oid = d.objid)
      WHEN 'pg_attrdef'::regclass    THEN (SELECT c.relnamespace FROM pg_attrdef x JOIN pg_class c ON c.oid = x.adrelid WHERE x.oid = d.objid)
      WHEN 'pg_policy'::regclass     THEN (SELECT c.relnamespace FROM pg_policy x JOIN pg_class c ON c.oid = x.polrelid WHERE x.oid = d.objid)
      WHEN 'pg_trigger'::regclass    THEN (SELECT c.relnamespace FROM pg_trigger x JOIN pg_class c ON c.oid = x.tgrelid WHERE x.oid = d.objid)
      WHEN 'pg_rewrite'::regclass    THEN (SELECT c.relnamespace FROM pg_rewrite x JOIN pg_class c ON c.oid = x.ev_class WHERE x.oid = d.objid)
      WHEN 'pg_default_acl'::regclass THEN 'nutrition'::regnamespace::oid   -- default privileges IN SCHEMA nutrition: in the dump
    END AS home
    FROM pg_depend d
    JOIN nutrition_objects n ON n.classid = d.refclassid AND n.objid = d.refobjid
   WHERE d.deptype IN ('n', 'a')
)
, found (object, why) AS (
SELECT o.type || ' ' || o.identity AS object, 'depends on ' || r.type || ' ' || r.identity AS why
  FROM dependents d
  CROSS JOIN LATERAL pg_identify_object(d.classid, d.objid, d.objsubid) o
  CROSS JOIN LATERAL pg_identify_object(d.refclassid, d.refobjid, 0) r
 WHERE d.home IS DISTINCT FROM 'nutrition'::regnamespace::oid
   AND d.home IS DISTINCT FROM 'pg_toast'::regnamespace::oid      -- unknown kinds (home NULL) are listed: better a false stop
UNION
-- 2. Triggers on tables outside nutrition (auth.users above all) that call a nutrition function
SELECT 'trigger ' || t.tgname || ' on ' || t.tgrelid::regclass, 'calls ' || t.tgfoid::regprocedure
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_class c ON c.oid = t.tgrelid
 WHERE p.pronamespace = 'nutrition'::regnamespace AND c.relnamespace <> 'nutrition'::regnamespace AND NOT t.tgisinternal
UNION
-- 3. Views outside nutrition whose text names it
SELECT 'view ' || schemaname || '.' || viewname, 'its definition names nutrition'
  FROM pg_views
 WHERE schemaname NOT IN ('nutrition', 'pg_catalog', 'information_schema') AND definition ILIKE '%nutrition.%'
UNION
-- 4. Functions outside nutrition whose body names it (not tracked by Postgres: CASCADE leaves them, but they fail while it is gone)
SELECT 'function ' || (pg_identify_object('pg_proc'::regclass, p.oid, 0)).identity, 'its body names nutrition'
  FROM pg_proc p
 WHERE p.pronamespace NOT IN ('nutrition'::regnamespace, 'pg_catalog'::regnamespace, 'information_schema'::regnamespace)
   AND p.prosrc ILIKE '%nutrition.%'
)
SELECT object, string_agg(DISTINCT why, '; ') AS why FROM found GROUP BY object ORDER BY object;
