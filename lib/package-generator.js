var childProcess = require('child_process'),
    fs = require('fs'),
    path = require('path'),
      dirname = path.dirname;

module.exports = {
  currentBranch: function(path, callback) {
    childProcess.exec('git symbolic-ref -q HEAD', {cwd: path}, function(err, stdout) {
      var currentBranch = stdout.split('\n')
          .filter(function(branch) { return branch; })
          .map(function(branch) { return branch.replace(/^refs\/heads\//, ''); })[0];
      callback(err, currentBranch);
    });
  },

  generate: function(configSource, output, callback) {
    fs.readFile(configSource, function(err, data) {
      if (err) {
        return callback(err);
      }

      data = JSON.parse(data);
      data.release = true;

      module.exports.currentBranch(dirname(configSource), function(err, branch) {
        if (err) {
          return callback(err);
        }

        // Copy over the index source file.
        try {
          var index = fs.readFileSync(dirname(configSource) + '/index.js');
          fs.writeFileSync(dirname(output) + '/index.js', index);
        } catch (err) {
          return callback(err);
        }

        data.name += '-' + branch.replace(/^release\//, '');
        fs.writeFile(output, JSON.stringify(data, undefined, 2), callback);
      });
    });
  }
};
