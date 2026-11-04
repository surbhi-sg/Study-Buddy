-- Task 1 assertions against tests/task1_fixture.sql.
-- psql -v ON_ERROR_STOP=1 -d studybuddy -f db/p2/tests/p2_tests.sql

DO $$
DECLARE
    n INTEGER;
    r RECORD;
    ids INTEGER[];
BEGIN
    SELECT COUNT(*) INTO n FROM fn_match_candidates(1, 1, 20);
    ASSERT n = 5, format('expected 5 candidates, got %s', n);

    SELECT ARRAY_AGG(candidate_id ORDER BY total_score DESC, candidate_id ASC)
    INTO ids
    FROM fn_match_candidates(1, 1, 20);
    ASSERT ids = ARRAY[2, 7, 3, 4, 8], format('unexpected order %s', ids);

    SELECT * INTO STRICT r FROM fn_match_candidates(1, 1, 20) WHERE candidate_id = 2;
    ASSERT r.candidate_name = 'Bina', 'bina name';
    ASSERT r.subject_score = 1.0000, 'bina subject';
    ASSERT r.overlap_minutes = 120, 'bina overlap minutes';
    ASSERT r.overlap_score = 1.0000, 'bina overlap score';
    ASSERT r.skill_score = 1.0000, 'bina skill';
    ASSERT r.mode_score = 1.0000, 'bina mode';
    ASSERT r.total_score = 1.0000, 'bina total';

    SELECT * INTO STRICT r FROM fn_match_candidates(1, 1, 20) WHERE candidate_id = 7;
    ASSERT r.overlap_minutes = 60, 'gita overlap minutes';
    ASSERT r.overlap_score = 0.5000, 'gita overlap score';
    ASSERT r.total_score = 0.7500, 'gita total';

    SELECT * INTO STRICT r FROM fn_match_candidates(1, 1, 20) WHERE candidate_id = 3;
    ASSERT r.overlap_minutes = 60, 'chetan overlap minutes';
    ASSERT r.skill_score = 0.5000, 'chetan skill';
    ASSERT r.mode_score = 0.0000, 'chetan mode';
    ASSERT r.total_score = 0.4000, 'chetan total';

    SELECT * INTO STRICT r FROM fn_match_candidates(1, 1, 20) WHERE candidate_id = 4;
    ASSERT r.overlap_minutes = 0, 'diya overlap';
    ASSERT r.total_score = 0.3000, 'diya total';

    SELECT * INTO STRICT r FROM fn_match_candidates(1, 1, 20) WHERE candidate_id = 8;
    ASSERT r.overlap_minutes = 0, 'hari overlap';
    ASSERT r.total_score = 0.3000, 'hari total';

    -- Esha (already grouped) and Farhan (not enrolled) must not appear.
    SELECT COUNT(*) INTO n
    FROM fn_match_candidates(1, 1, 20)
    WHERE candidate_id IN (5, 6);
    ASSERT n = 0, 'grouped or unenrolled student leaked';

    -- Requester not enrolled in subject 999 → empty.
    SELECT COUNT(*) INTO n FROM fn_match_candidates(1, 999, 20);
    ASSERT n = 0, 'missing subject should return no rows';

    RAISE NOTICE 'p2 task1 tests passed';
END
$$;
