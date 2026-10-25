-- Deterministic Task 1 fixture. Not referenced by functions/views.
-- Requester = student 1, subject 1 = DBMS, ISO Monday = 1.

INSERT INTO student (student_id, name, email, password_hash, year, branch) VALUES
    (1, 'Aanya',  'aanya@example.edu',  'x', 2, 'CSE'),
    (2, 'Bina',   'bina@example.edu',   'x', 2, 'CSE'),
    (3, 'Chetan', 'chetan@example.edu', 'x', 2, 'CSE'),
    (4, 'Diya',   'diya@example.edu',   'x', 2, 'CSE'),
    (5, 'Esha',   'esha@example.edu',   'x', 2, 'CSE'),
    (6, 'Farhan', 'farhan@example.edu', 'x', 2, 'CSE'),
    (7, 'Gita',   'gita@example.edu',   'x', 2, 'CSE'),
    (8, 'Hari',   'hari@example.edu',   'x', 2, 'CSE');

INSERT INTO subject (subject_id, name) VALUES (1, 'DBMS');

INSERT INTO student_subject (student_id, subject_id, skill_level) VALUES
    (1, 1, 3),
    (2, 1, 3),
    (3, 1, 5),
    (4, 1, 3),
    (5, 1, 3),
    -- 6 not enrolled
    (7, 1, 3),
    (8, 1, 3);

INSERT INTO availability (student_id, day_of_week, start_time, end_time, mode_preference) VALUES
    (1, 1, '10:00', '12:00', 'online'),
    (2, 1, '10:00', '12:00', 'online'),
    (3, 1, '11:00', '13:00', 'library'),
    (4, 2, '10:00', '12:00', 'online'),
    (5, 1, '10:00', '12:00', 'online'),
    (7, 1, '10:00', '11:00', 'online');
    -- 8: enrolled, no availability

INSERT INTO study_group (group_id, subject_id, mode, max_size, created_by) VALUES
    (1, 1, 'online', 4, 5);

INSERT INTO membership (student_id, group_id, role) VALUES
    (5, 1, 'admin');
