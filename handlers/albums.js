var helper = require('./helpers.js');
var async = require('async');
var fs = require('fs');

exports.version = "0.1.0";

exports.list_all = function(req, res) {
  load_album_list((err, albums) => {
    if (err) {
      helper.send_failure(res, 500, err);
      return;
    }

    helper.send_success(res, { albums: albums });
  });
}

exports.album_by_name = function(req, res) {
  // get the GET params
  var album_name = req.params.album_name;
  var getp = req.query;
  var page_num = getp.page ? getp.page : 0;
  var page_size = getp.page_size ? getp.page_size : 1000;

  if (isNaN(parseInt(page_num))) page_num = 0;
  if (isNaN(parseInt(page_size))) page_size = 1000;

  load_album(album_name, page_num, page_size, (err, album_contents) => {
    if (err && err == "no_such_album") {
      helper.send_failure(res, 404, err);
    } else if (err) {
      helper.send_failure(res, 500, err);
    } else {
      helper.send_success(res, { album_data: album_contents });
    }
  });
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