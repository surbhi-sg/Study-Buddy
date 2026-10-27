const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const profile = require('../controllers/profileController');
const dashboard = require('../controllers/dashboardController');
const groups = require('../controllers/groupController');
const match = require('../controllers/matchController');
const sessions = require('../controllers/sessionController');

router.get('/subjects', profile.listSubjects);            // public

router.use(requireAuth);                                   // everything below needs a token

router.get('/profile', profile.getProfile);
router.put('/profile/subjects', profile.putSubjects);
router.put('/profile/availability', profile.putAvailability);

router.get('/dashboard', dashboard.getDashboard);

router.get('/groups', groups.listGroups);
router.get('/groups/:id', groups.getGroup);
router.post('/groups/:id/join', groups.joinGroup);
router.post('/groups/:id/leave', groups.leaveGroup);

router.get('/match/candidates', match.candidates);
router.post('/match/group', match.createGroup);

router.get('/sessions', sessions.mySessions);
router.post('/sessions/:id/attendance', sessions.markAttendance);
router.post('/sessions/:id/feedback', sessions.giveFeedback);

module.exports = router;
