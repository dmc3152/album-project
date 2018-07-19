var express = require('express');
var app = express();

var path = require("path");
var fs = require('fs');
var formidable = require('formidable');
var appDir = path.dirname(require.main.filename);
var helper = require('./handlers/helpers.js');
var album_hdlr = require('./handlers/albums.js');
var page_hdlr = require('./handlers/pages.js');

app.use(express.static(__dirname + "/../static"));

app.get('/fileupload', upload_file);
app.get('/v1/albums.json', album_hdlr.list_all);
app.get('/v1/albums/:album_name.json', album_hdlr.album_by_name);
app.get('/pages/:page_name', page_hdlr.generate);
app.get('/pages/:page_name/:sub_page', page_hdlr.generate);

app.get("/", function (req, res) {
  res.redirect("/pages/home");
  res.end();
});

app.get('*', four_oh_four);

function four_oh_four(req, res) {
  helper.send_failure(res, 404, helper.invalid_resource());
}

function upload_file(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if(files.fileToUpload === undefined) {
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

app.listen(8080);