var express = require('express');
var router = express.Router();
var data = require('../data');

router.get('/', function(req, res, next) {
  if (req.session.loggedin) {
    res.redirect('/home');
  } else {
    res.redirect('/login');
  }
  res.end()
});

router.get('/home', function(req, res, next) {
  if (req.session.loggedin) {
    res.render('home', { title: 'Home', username: req.session.username, loggedin: req.session.loggedin });
  } else {
    res.redirect('/login');
  }
  res.end()
});

router.get('/register', function(req, res, next) {
  if (req.session.loggedin) {
    res.redirect('/home');
  } else {
    res.render('register', { title: 'Register' });
  }
  res.end();
})

router.get('/login', function(req, res, next) {
  if (req.session.loggedin) {
    res.redirect('/home');
  } else {
    res.render('login', { title: 'Login', loggedin: req.session.loggedin, loginpage: true });
  }
  res.end();
})

router.get('/logout', function(req, res, next) {
  if (req.session.loggedin) {
    req.session.loggedin = false;
    req.session.username = null;
    res.redirect('/');
  } else {
    res.redirect('/home');
  }
  res.end();
})

router.post("/auth", function(req, res) {
  let username = req.body.username;
  let password = req.body.password;

  if (!username || !password) {
    res.redirect("/");
    res.end();
    return;
  }

  data.FetchAccount(username, password, function(results) {
    if (results.length > 0) {
      req.session.loggedin = true;
      req.session.username = results[0].username;
      res.redirect('/home');
      console.log("User " + results[0].username + " logged in!");
    } else {
      res.send("Incorrect username or password");
    }
    res.end();
  });
});

router.post("/auth_register", function(req, res) {
  let username = req.body.username;
  let password = req.body.password;
  let email = req.body.email;

  if (!username || !password || !email) {
    res.redirect("/register");
    res.end();
    return;
  }

  data.FetchAccount(username, "", function(results) {
    if (results.length > 0) {
      res.send("Account already exists with that username/email!");
    } else {
      data.CreateAccount(email, username, password);
      req.session.loggedin = true;
      req.session.username = username;
      req.session.email = email;
      res.redirect('/home');
    }
    res.end();
  });
});

router.post("/auth_sendreset", function(req, res) {
  let email = req.body.email;

  if (!email) {
    res.redirect("/forgotpassword");
    res.end();
    return;
  }
  data.ResetPassword(email, function(token) {
    if (!token) {
      res.send("No account found with that email!");
      res.end();
      return;
    }
    res.redirect("/forgotpassword");
    res.end();
  })
});

router.post("/auth_reset", function(req, res) {
  let password = req.body.password;
  let token = req.session.token;

  if (!password) {
    res.redirect("/forgotpassword");
    res.end();
    return;
  }

  data.UpdatePassword(token, password, function(sucess) {
    res.redirect("/login");
    res.end();
  })
});

router.get("/forgotpassword", function(req, res) {
  if (req.session.loggedin) {
    res.redirect('/home');
  } else {
    res.render('forgotpassword', { title: 'Forgot Password', loggedin: req.session.loggedin });
  }
  res.end();
});

router.get("/resetpassword", function(req, res) {
  res.redirect("/");
  res.end();
});

router.get("/resetpassword/:token", function(req, res) {
  let token = req.params.token;

  data.FetchAccountByToken(token, function(results) {
    if (results.length > 0) {
      req.session.token = token;
      res.render('passwordreset', { title: 'Reset Password', username: results[0].username, token: token, loggedin: req.session.loggedin });
    } else {
      res.redirect("/");
    }
    res.end();
  });
});

module.exports = router;
