-- =====================================================================
-- Study Buddy | reset.sql | Owner: P4
-- Rebuilds the whole database from scratch: run before every demo and
-- rehearsal. Run it FROM THE REPO ROOT (the SOURCE paths are relative):
--
--   mysql -u root -p < db/reset.sql
--
-- WARNING: deletes the studybuddy database and everything in it.
-- =====================================================================
DROP DATABASE IF EXISTS studybuddy;
CREATE DATABASE studybuddy CHARACTER SET utf8mb4;
USE studybuddy;

SOURCE schema.sql;
SOURCE db/triggers.sql;
SOURCE db/views.sql;
SOURCE db/procedures.sql;
SOURCE db/indexes.sql;
SOURCE db/seed.sql;

SELECT 'studybuddy is ready' AS status,
       (SELECT COUNT(*) FROM student)       AS students,
       (SELECT COUNT(*) FROM study_group)   AS `groups`,
       (SELECT COUNT(*) FROM study_session) AS sessions;
