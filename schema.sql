-- =====================================================================
-- Study Buddy  |  schema_v2  |  MySQL 8.0.16 or later
-- (CHECK constraints are only enforced from 8.0.16; InnoDB is required for FKs)
-- Owner: P1 (Database Architect). Changes go through P1 only (see changelog).
--
-- Run on an empty database:
--   mysql -u root -p -e "CREATE DATABASE studybuddy CHARACTER SET utf8mb4"
--   mysql -u root -p studybuddy < schema.sql
--
-- All 9 tables are in BCNF (and 4NF). See the P1 pack, sections 7 to 10.
-- No indexes beyond PRIMARY KEY / UNIQUE / FK on purpose:
-- P2 adds indexes in indexes.sql so the EXPLAIN before/after is meaningful.
-- Date and time values are stored in UTC (DATETIME has no time zone).
-- =====================================================================

SET NAMES utf8mb4;

-- ENGINE RULE (P1 and P2): every table must be InnoDB. Transactions, row
-- locking (SELECT ... FOR UPDATE / SKIP LOCKED) and foreign keys do not work
-- on MyISAM, which silently ignores FOREIGN KEY clauses. InnoDB is the MySQL 8
-- default; it is also set explicitly here and on each table so a server with a
-- changed default cannot override it. Never write ENGINE=MyISAM in any file.
SET default_storage_engine = InnoDB;

-- ---------------------------------------------------------------------
-- student
-- ---------------------------------------------------------------------
CREATE TABLE student (
    student_id     INT          NOT NULL AUTO_INCREMENT,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,          -- bcrypt or similar, never plain text
    year           SMALLINT     NOT NULL,
    branch         VARCHAR(60)  NOT NULL,
    PRIMARY KEY (student_id),
    CONSTRAINT uq_student_email UNIQUE (email),
    CONSTRAINT ck_student_email CHECK (email LIKE '%_@_%._%'),
    CONSTRAINT ck_student_year  CHECK (year BETWEEN 1 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- subject  (reference data: never deleted, hence RESTRICT below)
-- ---------------------------------------------------------------------
CREATE TABLE subject (
    subject_id  INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    PRIMARY KEY (subject_id),
    CONSTRAINT uq_subject_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- student_subject  (M:N "studies", attribute skill_level)
-- ---------------------------------------------------------------------
CREATE TABLE student_subject (
    student_id   INT      NOT NULL,
    subject_id   INT      NOT NULL,
    skill_level  SMALLINT NOT NULL,                -- 1 = beginner ... 5 = expert
    PRIMARY KEY (student_id, subject_id),
    CONSTRAINT fk_ss_student FOREIGN KEY (student_id)
        REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id)
        REFERENCES subject (subject_id) ON DELETE RESTRICT,
    CONSTRAINT ck_ss_skill CHECK (skill_level BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- availability  (multivalued composite attribute of student)
-- day_of_week uses ISO numbering: 1 = Monday ... 7 = Sunday
--   (in MySQL: WEEKDAY(date) + 1)
-- Overlap of one student's slots is checked by the triggers below,
-- because MySQL has no exclusion constraints.
-- ---------------------------------------------------------------------
CREATE TABLE availability (
    student_id       INT         NOT NULL,
    day_of_week      SMALLINT    NOT NULL,
    start_time       TIME        NOT NULL,
    end_time         TIME        NOT NULL,
    mode_preference  VARCHAR(10) NOT NULL DEFAULT 'either',
    PRIMARY KEY (student_id, day_of_week, start_time),
    CONSTRAINT fk_av_student FOREIGN KEY (student_id)
        REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT ck_av_day  CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_av_time CHECK (end_time > start_time),
    CONSTRAINT ck_av_mode CHECK (mode_preference IN ('online', 'library', 'either'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- study_group  (folds in "is for" N:1 and "creates" 1:N)
-- ---------------------------------------------------------------------
CREATE TABLE study_group (
    group_id    INT         NOT NULL AUTO_INCREMENT,
    subject_id  INT          NOT NULL,
    name        VARCHAR(100) NOT NULL,                 -- shown on the Browse Groups page (added in v2)
    mode        VARCHAR(10)  NOT NULL,
    max_size    SMALLINT    NOT NULL DEFAULT 4,
    created_by  INT         NULL,                  -- NULL after the creator's account is deleted
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id),
    CONSTRAINT fk_sg_subject FOREIGN KEY (subject_id)
        REFERENCES subject (subject_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sg_creator FOREIGN KEY (created_by)
        REFERENCES student (student_id) ON DELETE SET NULL,
    CONSTRAINT ck_sg_mode CHECK (mode IN ('online', 'library')),
    CONSTRAINT ck_sg_size CHECK (max_size BETWEEN 2 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- membership  (M:N "joins", attributes role and joined_at)
-- The PRIMARY KEY also prevents duplicate membership.
-- Capacity (members <= max_size) is a trigger owned by P2.
-- ---------------------------------------------------------------------
CREATE TABLE membership (
    student_id  INT         NOT NULL,
    group_id    INT         NOT NULL,
    role        VARCHAR(10) NOT NULL DEFAULT 'member',
    joined_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, group_id),
    CONSTRAINT fk_mem_student FOREIGN KEY (student_id)
        REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT fk_mem_group FOREIGN KEY (group_id)
        REFERENCES study_group (group_id) ON DELETE CASCADE,
    CONSTRAINT ck_mem_role CHECK (role IN ('admin', 'member'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- study_session  (called "Session" in the ER model; renamed to avoid
-- clashing with SQL and framework session tables)
-- ---------------------------------------------------------------------
CREATE TABLE study_session (
    session_id        INT          NOT NULL AUTO_INCREMENT,
    group_id          INT          NOT NULL,
    start_datetime    DATETIME     NOT NULL,
    duration_minutes  SMALLINT     NOT NULL DEFAULT 60,
    location_or_link  VARCHAR(255) NOT NULL,
    PRIMARY KEY (session_id),
    CONSTRAINT fk_ses_group FOREIGN KEY (group_id)
        REFERENCES study_group (group_id) ON DELETE CASCADE,
    CONSTRAINT ck_ses_duration CHECK (duration_minutes BETWEEN 15 AND 480)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- attendance  (weak entity / M:N between study_session and student)
-- "Only members of the session's group" is a trigger owned by P2.
-- ---------------------------------------------------------------------
CREATE TABLE attendance (
    session_id  INT         NOT NULL,
    student_id  INT         NOT NULL,
    status      VARCHAR(10) NOT NULL,
    PRIMARY KEY (session_id, student_id),
    CONSTRAINT fk_att_session FOREIGN KEY (session_id)
        REFERENCES study_session (session_id) ON DELETE CASCADE,
    CONSTRAINT fk_att_student FOREIGN KEY (student_id)
        REFERENCES student (student_id) ON DELETE CASCADE,
    CONSTRAINT ck_att_status CHECK (status IN ('present', 'absent', 'excused'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- feedback  (weak entity). The composite FK guarantees an attendance row
-- exists; a trigger owned by P2 additionally requires status = 'present'.
-- ---------------------------------------------------------------------
CREATE TABLE feedback (
    session_id  INT      NOT NULL,
    student_id  INT      NOT NULL,
    rating      SMALLINT NOT NULL,
    comment     TEXT     NULL,
    PRIMARY KEY (session_id, student_id),
    CONSTRAINT fk_fb_attendance FOREIGN KEY (session_id, student_id)
        REFERENCES attendance (session_id, student_id) ON DELETE CASCADE,
    CONSTRAINT ck_fb_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Triggers: one student's availability slots on one day must not overlap
-- (touching ends such as 17:00-18:00 and 18:00-19:00 are allowed).
-- Raises SQLSTATE 45000 (errno 1644) with a readable message.
-- Limitation: two simultaneous inserts for the same student and day could
-- both pass the check; acceptable for this project (slots are edited by
-- one user at a time).
-- ---------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_availability_no_overlap_ins
BEFORE INSERT ON availability
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM availability a
                WHERE a.student_id  = NEW.student_id
                  AND a.day_of_week = NEW.day_of_week
                  AND a.start_time  < NEW.end_time
                  AND a.end_time    > NEW.start_time) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Availability slot overlaps an existing slot';
    END IF;
END$$

CREATE TRIGGER trg_availability_no_overlap_upd
BEFORE UPDATE ON availability
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM availability a
                WHERE a.student_id  = NEW.student_id
                  AND a.day_of_week = NEW.day_of_week
                  AND a.start_time  < NEW.end_time
                  AND a.end_time    > NEW.start_time
                  AND NOT (a.student_id  = OLD.student_id
                       AND a.day_of_week = OLD.day_of_week
                       AND a.start_time  = OLD.start_time)) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Availability slot overlaps an existing slot';
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- Changelog (one line per change; each version is also saved as a file)
-- v1  initial schema, 9 tables, BCNF/4NF, MySQL 8.0.16+.
-- v2  study_group.name VARCHAR(100) NOT NULL added: the Browse Groups page needs a
--     title, otherwise two groups for the same subject look identical.
--     Affects P3 (API field) and P4 (UI, seed data). Still BCNF/4NF: name depends on
--     group_id only. To upgrade an existing v1 database (old rows get '' and should
--     be renamed): ALTER TABLE study_group ADD COLUMN name VARCHAR(100) NOT NULL AFTER subject_id;
-- =====================================================================
