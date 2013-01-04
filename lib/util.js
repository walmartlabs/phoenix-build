var fs = require('fs'),
    path = require('path'),
    util = require('util');

// Recursive mkdir
// mkdirsSync(path, [mode=(0777^umask)]) -> pathsCreated
exports.mkdir = function(dirname, mode) {
  if (mode === undefined) {
    mode = parseInt('0777', 8) ^ process.umask();
  }
  var pathsNotFound = [];
  var fn = dirname;
  while (true) {
    try {
      var stats = fs.statSync(fn);
      if (stats.isDirectory()) {
        break;
      }
      throw new Error('Unable to create directory at ' + fn);
    }
    catch (e) {
      pathsNotFound.push(fn);
      fn = path.dirname(fn);
    }
  }
  for (var i = pathsNotFound.length - 1; i > -1; i--) {
    var fn = pathsNotFound[i];
    console.log('mkdir:\t\033[90mmaking directory\033[0m ' + fn);
    fs.mkdirSync(fn, mode);
  }
};

exports.streamData = function(prefix, data) {
  var lines = data.toString().split(/\r\n|\n|\r/g);
  for (var i = 0, len = lines.length - 1; i < len; i++) {
    util.print(prefix);
    util.print(lines[i]);
    util.print('\n');
  }
  if (lines[lines.length - 1]) {
    util.print(prefix);
    util.print(lines[lines.length - 1]);
  }
};
