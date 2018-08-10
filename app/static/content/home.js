$(function () {
  var tmpl;   // Main template HTML
  var tdata = {};  // JSON data object that feeds the template
  // Initialize page
  var initPage = function () {
    // Load the HTML template
    $.get("/templates/home.html", function (d) {                     // 1
      tmpl = d;
    });
    // Retrieve the server data and then initialize the page
    $.getJSON("/v1/albums.json", function (d) {                       // 2
      $.extend(tdata, d.data);
    });
    // When AJAX calls are complete parse the template
    // replacing mustache tags with vars
    $(document).ajaxStop(function () {
      var renderedPage = Mustache.to_html(tmpl, tdata);          // 3
      $("body").html(renderedPage);
    })
  }();
});