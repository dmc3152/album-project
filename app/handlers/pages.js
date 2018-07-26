var helpers = require("./helpers.js");
var fs = require("fs");

exports.version = "0.1.0";

exports.generateAdmin = function (req, res) {
  req.params.page_name = 'admin_' + req.params.sub_page;
  exports.generate(req, res);
};

exports.generate = function(req, res) {
  var page = req.params.page_name;

  fs.readFile('basic.html', function(err, contents) {
    if(err) {
      helpers.send_failure(res, 500, err);
      return;
    }

    contents = contents.toString('utf8');
    contents = contents.replace('{{PAGE_NAME}}', page);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(contents);
  });
}

// if we made it here, then we're logged in. redirect to admin home
exports.login = function (req, res) {
  res.redirect("/pages/admin/home");
  res.end();
};