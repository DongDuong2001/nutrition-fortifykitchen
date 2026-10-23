-- The grants on the nutrition schema and everything in it, as SQL that gives them back (docs/runbooks/migrate-1023.md,
-- "Restore the backup"): the schema, tables, views and sequences, their columns, functions, and the default privileges set
-- IN SCHEMA nutrition. The owner's own rights are left out (the owner has them anyway). Sorted, so two runs can be diffed.
WITH grantee AS (SELECT 0::oid AS oid, 'PUBLIC' AS name UNION ALL SELECT oid, quote_ident(rolname) FROM pg_roles)
SELECT stmt FROM (
  SELECT format('GRANT %s ON SCHEMA nutrition TO %s%s;', a.privilege_type, g.name, CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a JOIN grantee g ON g.oid = a.grantee
   WHERE n.nspname = 'nutrition' AND a.grantee <> n.nspowner
  UNION ALL
  SELECT format('GRANT %s ON %s %s TO %s%s;', a.privilege_type, CASE c.relkind WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, c.oid::regclass,
                g.name, CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a JOIN grantee g ON g.oid = a.grantee
   WHERE c.relnamespace = 'nutrition'::regnamespace AND a.grantee <> c.relowner
  UNION ALL
  SELECT format('GRANT %s (%I) ON TABLE %s TO %s%s;', a.privilege_type, att.attname, c.oid::regclass,
                g.name, CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM pg_attribute att JOIN pg_class c ON c.oid = att.attrelid
    CROSS JOIN LATERAL aclexplode(att.attacl) a JOIN grantee g ON g.oid = a.grantee
   WHERE c.relnamespace = 'nutrition'::regnamespace AND att.attnum > 0 AND NOT att.attisdropped AND a.grantee <> c.relowner
  UNION ALL
  SELECT format('GRANT %s ON FUNCTION %s TO %s%s;', a.privilege_type, p.oid::regprocedure, g.name,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a JOIN grantee g ON g.oid = a.grantee
   WHERE p.pronamespace = 'nutrition'::regnamespace AND a.grantee <> p.proowner
  UNION ALL
  SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA nutrition GRANT %s ON %s TO %s%s;', pg_get_userbyid(d.defaclrole),
                a.privilege_type, CASE d.defaclobjtype WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' WHEN 'f' THEN 'FUNCTIONS' WHEN 'T' THEN 'TYPES' END,
                g.name, CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a JOIN grantee g ON g.oid = a.grantee
   WHERE d.defaclnamespace = 'nutrition'::regnamespace AND a.grantee <> d.defaclrole
) s(stmt)
ORDER BY stmt;
