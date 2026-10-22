-- 000016_day_templates.down.sql
-- Drops every saved template. Take a pg_dump of the table first if they should be kept.
DROP TABLE IF EXISTS nutrition.day_templates;
