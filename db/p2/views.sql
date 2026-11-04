-- P2 views. Task 1: weights only. Later tasks append dashboard/streak/report views.

DROP VIEW IF EXISTS v_match_weights;

-- Single-row constants so match scoring is tunable without rewriting fn_match_candidates.
-- Weights sum to 1.00. Same-subject is a gate, not a weight.
CREATE VIEW v_match_weights AS
SELECT
    0.50::NUMERIC(4, 2) AS w_overlap,
    0.30::NUMERIC(4, 2) AS w_skill,
    0.20::NUMERIC(4, 2) AS w_mode,
    1::SMALLINT         AS skill_min,
    5::SMALLINT         AS skill_max;
