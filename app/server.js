var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');
var flash = require('express-flash');
var morgan = require('morgan');
var multer = require('multer');

var app = express();

var path = require("path");
var fs = require('fs');
var formidable = require('formidable');
var appDir = path.dirname(require.main.filename);

var db = require('./data/db.js');
var helper = require('./handlers/helpers.js');
var album_hdlr = require('./handlers/albums.js');
var page_hdlr = require('./handlers/pages.js');


var session_configuration = {
  secret: 'whoopity whoopity whoop whoop',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
};

session_configuration.cookie.secure = false;

app.use(flash());
app.use(session(session_configuration));
app.use(cookieParser('whoopity whoopity whoop whoop'));
app.use(passport.initialize());
app.use(passport.session());

var users = {
  "id123456": { id: 123456, username: "marcwan", password: "boo" },
  "id1": { id: 1, username: "admin", password: "admin" }
};

function authenticatedOrNot(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/login");
  }
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

var upload = multer({ dest: "uploads/" });

passport.use(new LocalStrategy(
  function (username, password, done) {
    setTimeout(function () {
      for (userid in users) {
        var user = users[userid];
        console.log(user);
        if (user.username.toLowerCase() == username.toLowerCase()) {
          if (user.password == password) {
            return done(null, user);
          }
        }
      }
      return done(null, false, { message: 'Incorrect credentials.' });
    }, 1000);
  }
));

passport.serializeUser(function (user, done) {
  if (users["id" + user.id]) {
    done(null, "id" + user.id);
  } else {
    done(new Error("WAT"));
  }
});

passport.deserializeUser(function (userid, done) {
  if (users[userid]) {
    done(null, users[userid]);
  } else {
    done(new Error("CANTFINDUSER"));
  }
});


app.use(express.static(__dirname + "/../static"));
app.use(morgan('dev'));

app.get('/fileupload', upload_file);
app.get('/v1/albums.json', album_hdlr.list_all);
app.put('/v1/albums.json', album_hdlr.create_album);

app.get('/v1/albums/:album_name.json', album_hdlr.album_by_name);
app.get('/v1/albums/:album_name/photos.json', album_hdlr.photos_for_album);
app.put('/v1/albums/:album_name/photos.json', upload.single("photo_file"), album_hdlr.add_photo_to_album);

app.get('/pages/:page_name', page_hdlr.generate);
app.get('/pages/:page_name/:sub_page', page_hdlr.generate);

app.get("/", function (req, res) {
  res.redirect("/pages/home");
  res.end();
});

app.get("/login", function (req, res) {
  var error = req.flash("error");
  var form = '<form action="/login" method="post">' +
    '    <div>' +
    '        <label>Username:</label>' +
    '        <input type="text" name="username"/>' +
    '    </div>' +
    '    <div>' +
    '        <label>Password:</label>' +
    '        <input type="password" name="password"/>' +
    '    </div>' +
    '    <div>' +
    '        <input type="submit" value="Log In"/>' +
    '    </div>' +
    '</form>';

  if (error && error.length) {
    form = "<b style='color: red'> " + error[0] + "</b><br/>" + form;
  }
  res.send(form);
});

app.post("/login",
  passport.authenticate('local', {
    successRedirect: '/members',
    failureRedirect: '/login',
    successFlash: { message: "welcome back" },
    failureFlash: true
  })
);

app.get("/members", authenticatedOrNot, function (req, res) {
  res.send("secret members only area!");
});

app.get('*', four_oh_four);

function four_oh_four(req, res) {
  helper.send_failure(res, 404, helper.invalid_resource());
}

function upload_file(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (files.fileToUpload === undefined) {
      helper.send_failure(res, 404, upload_failure());
    }
    var oldpath = files.fileToUpload.path;
    var newpath = appDir + '/albums/album1/' + files.fileToUpload.name;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      res.write('File successfully uploaded to album1!');
      res.end();
    });
  });
}

db.init(function (err, results) {
  if (err) {
    console.error("** FATAL ERROR ON STARTUP: ");
    console.error(err);
    process.exit(-1);
  }

  console.log("Initialisation complete. Running Server.");
  app.listen(8080);
});