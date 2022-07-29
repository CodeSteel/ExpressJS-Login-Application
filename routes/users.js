var express = require('express');
var router = express.Router();
var data = require('../data');

/* GET users listing. */
router.get('/', function(req, res, next) {
  if (req.session.loggedin) {
    data.GetAllUsers(function(users) {
      res.render('users', { title: 'Users', username: req.session.username, users: users, loggedin: req.session.loggedin });
      res.end();
      return;
    });
  } else {
    res.redirect('/login');
    res.end();
  }
});

module.exports = router;
