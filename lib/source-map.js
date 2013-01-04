var request = require('request'),
    sourceMap = require('source-map'),
      SourceMapConsumer = sourceMap.SourceMapConsumer,
    url = require('url');

var cache = {};

function loadSourceMap(file, callback) {
  request(file, function(err, res, body) {
    var match = /@ ?sourceMappingURL=(.*)\n/.exec(body || '');
    if (match) {
      request(url.resolve(file, match[1]), function(err, res, body) {
        if (!err && (res.statusCode === 200 || res.statusCode === 304) && body) {
          callback(undefined, new SourceMapConsumer(body));
        } else {
          callback();
        }
      });
    } else {
      callback();
    }
  });
}

exports.map = function(file, line, column, callback) {
  function bound() {
    exports.map(file, line, column, callback);
  }
  if (cache[file] !== undefined) {
    if (!cache[file]) {
      callback(undefined, file, line);
    } else if (cache[file].pending) {
      cache[file].pending.push(bound);
    } else {
      var original = cache[file].originalPositionFor({line: line, column: column});
      callback(undefined, original.source, original.line);
    }
  } else {
    cache[file] = {
      pending: [bound]
    };

    loadSourceMap(file, function(err, map) {
      var pending = cache[file].pending;

      cache[file] = map || false;
      pending.forEach(function(callback) {
        callback();
      });
    });
  }
};
exports.reset = function() {
  cache = {};
};
