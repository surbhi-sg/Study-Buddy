"""SQL shared by several routes (derived values that are computed, never stored)."""
import config

# One row per group with its derived values: member count, next session, average rating.
GROUP_SUMMARY = """
SELECT g.group_id, g.name AS group_name, g.subject_id, sub.name AS subject, g.mode, g.max_size, g.created_by,
       (SELECT COUNT(*) FROM membership m WHERE m.group_id = g.group_id)            AS member_count,
       (SELECT MIN(s.start_datetime) FROM study_session s
         WHERE s.group_id = g.group_id AND s.start_datetime > UTC_TIMESTAMP())       AS next_session,
       (SELECT ROUND(AVG(f.rating), 1) FROM feedback f
          JOIN study_session s ON s.session_id = f.session_id
         WHERE s.group_id = g.group_id)                                              AS avg_rating
  FROM study_group g
  JOIN subject sub ON sub.subject_id = g.subject_id
"""

# Every session of every group the student is in, with the student's attendance (NULL = not marked).
STUDENT_SESSIONS = """
SELECT s.session_id, s.group_id, g.name AS group_name, sub.name AS subject, g.mode,
       s.start_datetime, s.duration_minutes, s.location_or_link, a.status AS attendance_status
  FROM membership m
  JOIN study_group g     ON g.group_id = m.group_id
  JOIN subject sub       ON sub.subject_id = g.subject_id
  JOIN study_session s   ON s.group_id = g.group_id
  LEFT JOIN attendance a ON a.session_id = s.session_id AND a.student_id = m.student_id
 WHERE m.student_id = %(me)s
"""

# Study streak, gaps-and-islands: number the student's attended days in order. For consecutive days,
# (day - row number) is the same date, so it labels each run ("island"). The current streak is the
# run that ends today or yesterday. Uses a CTE and the ROW_NUMBER() window function.
STREAK = """
WITH days AS (
    SELECT DISTINCT DATE(CONVERT_TZ(s.start_datetime, '+00:00', %(tz)s)) AS d
      FROM attendance a JOIN study_session s ON s.session_id = a.session_id
     WHERE a.student_id = %(me)s AND a.status = 'present'
),
numbered AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn FROM days
),
islands AS (
    SELECT DATE_SUB(d, INTERVAL rn DAY) AS island, MAX(d) AS last_day, COUNT(*) AS n
      FROM numbered GROUP BY island
)
SELECT COALESCE(MAX(CASE WHEN last_day >= DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', %(tz)s)) - INTERVAL 1 DAY
                         THEN n END), 0) AS current_streak,
       COALESCE(MAX(n), 0) AS longest_streak
  FROM islands
"""


def tz():
    return config.TZ
