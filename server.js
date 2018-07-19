var express = require('express');
var app = express();

var path = require("path");
var fs = require('fs');
var formidable = require('formidable');
var appDir = path.dirname(require.main.filename);
var helper = require('./handlers/helpers.js');
var album_hdlr = require('./handlers/albums.js');
var page_hdlr = require('./handlers/pages.js');

function serve_static_file(file, res) {
  var rs = fs.createReadStream(file);
  rs.on('error', (e) => {
    res.writeHead(404, { "Content-Type": "application/json" });
    var out = {
      error: "not_found",
      message: "'" + file + "' not found"
    };
    res.end(JSON.stringify(out) + "\n");
    return;
  });

  var ct = content_type_for_file(file);
  res.writeHead(200, { "Content-Type": ct });
  rs.pipe(res);
}

function content_type_for_file(file) {
  var ext = path.extname(file);
  switch (ext.toLowerCase()) {
    case '.html': return "text/html";
    case ".js": return "text/javascript";
    case ".css": return 'text/css';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    default: return 'text/plain';
  }
}

app.get('/fileupload', upload_file);
app.get('/v1/albums.json', album_hdlr.list_all);
app.get('/v1/albums/:album_name.json', album_hdlr.album_by_name);
app.get('/v1/albums/:album_name/:image', function (req, res) {
  serve_static_file('albums/' + req.params.album_name + '/' + req.params.image, res);
});
app.get('/content/:filename', function (req, res) {
  serve_static_file('content/' + req.params.filename, res);
});
app.get('/templates/:template_name', function (req, res) {
  serve_static_file('templates/' + req.params.template_name, res);
});
app.get('/pages/:page_name', page_hdlr.generate);
app.get('/pages/:page_name/:sub_page', page_hdlr.generate);
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