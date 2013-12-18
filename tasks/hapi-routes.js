var _ = require('underscore'),
    Lumbar = require('lumbar');

module.exports = function(grunt) {
  grunt.registerMultiTask('hapi-routes', 'outputs a projects module map', function() {
    var done = this.async();

    var config = this.options({config: './lumbar.json'}),
        lumbarFile = config.config,
        outputFile = config.dest;

    var lumbar = Lumbar.init(lumbarFile, {libraries: [__dirname + '/../mixin']});
    lumbar.moduleMap(config.package, function(err, map) {
      if (err) {
        throw err;
      }

      var ret = [];
      _.each(map, function(package, packageName) {
        _.each(package, function(platform, platformName) {
          _.each(platform.routes, function(moduleName, route) {
            ret.push(remapRoute(route));
          });
        });
      });

      ret = ret.sort();
      grunt.file.write(outputFile, JSON.stringify(ret, undefined, 2));
      done();
    });
  });
};

// Remaps a backbone-style route to a hapi-style route.
// Note that neither system supports all of the features of the other so conflicts may occur.
// These situations are left to the application to resolve.
function remapRoute(route) {
  // (/:foo) -> /{foo?}
  // (:foo) -> {foo?}
  // :foo -> {foo}
  // *foo -> {foo*}
  route = route
      .replace(/\(\/:(\w+?)\)/g, '/{$1?}')
      .replace(/\(:(\w+?)\)/g, '{$1?}')
      .replace(/:(\w+)/g, '{$1}')
      .replace(/\*(\w+)/g, '{$1*}');
  return '/' + route;
}
