var express = require('express');
var app = express();

var async = require('async');
var path = require("path");
var fs = require('fs');
var formidable = require('formidable');
var appDir = path.dirname(require.main.filename);

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

function load_album_list(callback) {
  // we will just assume that any directory in our 'albums'
  // subfolder is an album.
  fs.readdir("albums", (err, files) => {
    if (err) {
      callback({
        error: "file_error",
        message: JSON.stringify(err)
      });
      return;
    }

    var only_dirs = [];
    async.forEach(files, (element, cb) => {
      fs.stat("albums/" + element, (err, stats) => {
        if (err) {
          cb({
            error: "file_error",
            message: JSON.stringify(err)
          });
          return;
        }
        if (stats.isDirectory()) {
          only_dirs.push({ name: element });
        }
        cb(null);
      }
      );
    },
      (err) => {
        callback(err, err ? null : only_dirs);
      });
  });
}

function load_album(album_name, page, page_size, callback) {
  fs.readdir("albums/" + album_name, (err, files) => {
    if (err) {
      if (err.code == "ENOENT") {
        callback(no_such_album());
      } else {
        callback({
          error: "file_error",
          message: JSON.stringify(err)
        });
      }
      return;
    }

    var only_files = [];
    var path = "albums/" + album_name + "/";
    async.forEach(files, (element, cb) => {
      fs.stat(path + element, (err, stats) => {
        if (err) {
          cb({
            error: "file_error",
            message: JSON.stringify(err)
          });
          return;
        }
        if (stats.isFile()) {
          var obj = {
            filename: element,
            desc: element
          };
          only_files.push(obj);
        }
        cb(null);
      });
    },

    function (err) {
      if (err) {
        callback(err);
      } else {
        var start = page * page_size;
        var photos = only_files.slice(start, start + page_size);
        var obj = {
          short_name: album_name,
          photos: photos
        };
        callback(null, obj);
      }
    });
  });
}

/**
 * All pages come from the same one skeleton HTML file that
 * just changes the name of the JavaScript loader that needs to be
 * downloaded.
 */
function serve_page(req, res) {
  var page = get_page_name(req);

  fs.readFile('basic.html', (err, contents) => {
    if (err) {
      send_failure(res, 500, err);
      return;
    }

    contents = contents.toString('utf8');

    // replace page name, and then dump to output.
    contents = contents.replace('{{PAGE_NAME}}', page);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(contents);
  });
}

app.get('/fileupload', upload_file);
app.get('/albums.json', handle_list_albums);
app.get('/albums/:album_name.json', handle_get_album);
app.get('/albums/:album_name/:image', function (req, res) {
  serve_static_file('albums/' + req.params.album_name + '/' + req.params.image, res);
});
app.get('/content/:filename', function (req, res) {
  serve_static_file('content/' + req.params.filename, res);
});
app.get('/templates/:template_name', function (req, res) {
  serve_static_file('templates/' + req.params.template_name, res);
});
app.get('/pages/:page_name', serve_page);
app.get('/pages/:page_name/:sub_page', serve_page);
app.get('*', four_oh_four);

function four_oh_four(req, res) {
  send_failure(res, 404, invalid_resource());
}

function upload_file(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if(files.fileToUpload === undefined) {
      send_failure(res, 404, upload_failure());
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

function handle_list_albums(req, res) {
  load_album_list((err, albums) => {
    if (err) {
      send_failure(res, 500, err);
      return;
    }

    send_success(res, { albums: albums });
  });
}

function handle_get_album(req, res) {
  // get the GET params
  var album_name = get_album_name(req);
  var getp = get_query_params(req);
  var page_num = getp.page ? getp.page : 0;
  var page_size = getp.page_size ? getp.page_size : 1000;

  if (isNaN(parseInt(page_num))) page_num = 0;
  if (isNaN(parseInt(page_size))) page_size = 1000;

  load_album(album_name, page_num, page_size, (err, album_contents) => {
    if (err && err == "no_such_album") {
      send_failure(res, 404, err);
    } else if (err) {
      send_failure(res, 500, err);
    } else {
      send_success(res, { album_data: album_contents });
    }
  });
}

function send_success(res, data) {
  res.writeHead(200, { "Content-Type": "application/json" });
  var output = { error: null, data: data };
  res.end(JSON.stringify(output) + "\n");
}

function send_failure(res, server_code, err) {
  var code = (err.code) ? err.code : err.name;
  res.writeHead(server_code, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}

function invalid_resource() {
  return {
    error: "invalid_resource",
    message: "the requested resource does not exist."
  };
}

function no_such_album() {
  return {
    error: "no_such_album",
    message: "The specified album does not exist"
  };
}

function upload_failure() {
  return {
    error: "upload_failure",
    message: "The chosen file did not upload."
  };
}

function get_album_name(req) {
  return req.params.album_name;
}

function get_template_name(req) {
  return req.params.template_name;
}

function get_query_params(req) {
  return req.query;
}

function get_page_name(req) {
  return req.params.page_name;
}

app.listen(8080);