var childProcess = require('child_process'),
    fs = require('fs'),
    path = require('path'),
      dirname = path.dirname,
    util = require('./util');

module.exports = {
  currentBranch: function(path, callback) {
    childProcess.exec('git symbolic-ref -q HEAD', {cwd: path}, function(err, stdout, stderr) {
      util.streamData('git: ', stdout);
      if (stderr) {
        util.streamData('git err: ', stderr);
      }

      var currentBranch = stdout.split('\n')
          .filter(function(branch) { return branch; })
          .map(function(branch) { return branch.replace(/^refs\/heads\//, ''); })[0];
      callback(err, currentBranch);
    });
  },

  generate: function(configSource, branch, output, callback) {
    fs.readFile(configSource, function(err, data) {
      if (err) {
        return callback(err);
      }

      data = JSON.parse(data);
      data.release = true;

      if (!branch) {
        module.exports.currentBranch(dirname(configSource), function(err, branch) {
          if (err) {
            return callback(err);
          }

          exec(branch);
        });
      } else {
        exec(branch);
      }

      function exec(branch) {
        // Copy over the index source file.
        try {
          var src = dirname(configSource) + '/index.js',
              dest = dirname(output) + '/index.js';
          console.log('package: ', 'Copying package index "' + src + '" to "' + dest + '"');
          var index = fs.readFileSync(src);
          fs.writeFileSync(dest, index);
        } catch (err) {
          return callback(err);
        }

        data.name += '-' + branch.replace(/^release\//, '');
        console.log('package: ', 'Output package config for branch "' + data.name + '"');
        fs.writeFile(output, JSON.stringify(data, undefined, 2), callback);
      }
    });
  }
};
