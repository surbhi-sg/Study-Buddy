-- P2 functions. Task 1: fn_match_candidates.

CREATE OR REPLACE FUNCTION fn_match_candidates(
    p_student_id  INTEGER,
    p_subject_id  INTEGER,
    p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE (
    candidate_id     INTEGER,
    candidate_name   TEXT,
    total_score      NUMERIC,
    subject_score    NUMERIC,
    overlap_minutes  INTEGER,
    overlap_score    NUMERIC,
    skill_score      NUMERIC,
    mode_score       NUMERIC
)
LANGUAGE sql
STABLE
AS $$
    WITH weights AS (
        SELECT w_overlap, w_skill, w_mode, skill_min, skill_max
        FROM v_match_weights
    ),
    requester_subject AS (
        SELECT ss.skill_level
        FROM student_subject AS ss
        WHERE ss.student_id = p_student_id
          AND ss.subject_id = p_subject_id
    ),
    requester_avail AS (
        SELECT a.day_of_week, a.start_time, a.end_time, a.mode_preference
        FROM availability AS a
        WHERE a.student_id = p_student_id
    ),
    requester_total_minutes AS (
        SELECT COALESCE(
            SUM(EXTRACT(EPOCH FROM (ra.end_time - ra.start_time)) / 60.0),
            0
        ) AS minutes
        FROM requester_avail AS ra
    ),
    -- Choice (Q8): already in ANY group for this subject → not a candidate.
    already_grouped AS (
        SELECT m.student_id
        FROM membership AS m
        INNER JOIN study_group AS g ON g.group_id = m.group_id
        WHERE g.subject_id = p_subject_id
    ),
    candidates AS (
        SELECT s.student_id, s.name, ss.skill_level
        FROM student AS s
        INNER JOIN student_subject AS ss
            ON ss.student_id = s.student_id
        WHERE ss.subject_id = p_subject_id
          AND s.student_id <> p_student_id
          AND NOT EXISTS (
              SELECT 1
              FROM already_grouped AS ag
              WHERE ag.student_id = s.student_id
          )
    ),
    overlap_pairs AS (
        SELECT
            c.student_id,
            GREATEST(
                0,
                EXTRACT(
                    EPOCH FROM (
                        LEAST(ca.end_time, ra.end_time)
                        - GREATEST(ca.start_time, ra.start_time)
                    )
                ) / 60.0
            ) AS overlap_min,
            CASE
                WHEN ca.mode_preference = ra.mode_preference THEN
                    GREATEST(
                        0,
                        EXTRACT(
                            EPOCH FROM (
                                LEAST(ca.end_time, ra.end_time)
                                - GREATEST(ca.start_time, ra.start_time)
                            )
                        ) / 60.0
                    )
                ELSE 0
            END AS mode_overlap_min
        FROM candidates AS c
        INNER JOIN availability AS ca ON ca.student_id = c.student_id
        INNER JOIN requester_avail AS ra ON ra.day_of_week = ca.day_of_week
    ),
    overlap_agg AS (
        SELECT
            op.student_id,
            SUM(op.overlap_min)::INTEGER AS overlap_minutes,
            SUM(op.mode_overlap_min)     AS mode_overlap_minutes
        FROM overlap_pairs AS op
        WHERE op.overlap_min > 0
        GROUP BY op.student_id
    ),
    scored AS (
        SELECT
            c.student_id AS candidate_id,
            c.name       AS candidate_name,
            1.0::NUMERIC AS subject_score,
            COALESCE(o.overlap_minutes, 0) AS overlap_minutes,
            CASE
                WHEN rtm.minutes > 0 THEN
                    LEAST(
                        1.0,
                        COALESCE(o.overlap_minutes, 0)::NUMERIC / rtm.minutes
                    )
                ELSE 0::NUMERIC
            END AS overlap_score,
            CASE
                WHEN (w.skill_max - w.skill_min) = 0 THEN 1.0::NUMERIC
                ELSE 1.0 - (
                    ABS(c.skill_level - rs.skill_level)::NUMERIC
                    / (w.skill_max - w.skill_min)
                )
            END AS skill_score,
            CASE
                WHEN COALESCE(o.overlap_minutes, 0) > 0 THEN
                    o.mode_overlap_minutes / o.overlap_minutes
                ELSE 0::NUMERIC
            END AS mode_score,
            w.w_overlap,
            w.w_skill,
            w.w_mode
        FROM candidates AS c
        INNER JOIN requester_subject AS rs ON TRUE
        CROSS JOIN weights AS w
        CROSS JOIN requester_total_minutes AS rtm
        LEFT JOIN overlap_agg AS o ON o.student_id = c.student_id
    )
    SELECT
        s.candidate_id,
        s.candidate_name,
        ROUND(
            (s.w_overlap * s.overlap_score)
            + (s.w_skill * s.skill_score)
            + (s.w_mode * s.mode_score),
            4
        ) AS total_score,
        ROUND(s.subject_score, 4) AS subject_score,
        s.overlap_minutes,
        ROUND(s.overlap_score, 4) AS overlap_score,
        ROUND(s.skill_score, 4) AS skill_score,
        ROUND(s.mode_score, 4) AS mode_score
    FROM scored AS s
    ORDER BY total_score DESC, s.candidate_id ASC
    LIMIT p_limit;
$$;
