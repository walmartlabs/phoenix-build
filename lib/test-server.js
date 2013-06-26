var portscanner = require('portscanner'),
    server = require('./server');

exports.exec = function(projectDir, exec) {
  if (server.config()) {
    exec(server.config().port);
  } else {
    var run;
    findPorts(function(port, securePort) {
      server.start({
        projectDir: projectDir,
        mocks: true,
        test: true,
        port: port,
        securePort: securePort,
        data: function() {
          if (run) {
            return;
          }
          run = true;

          exec(port, securePort);
        }
      });
    });
  }
};

function findPorts(callback) {
  portscanner.findAPortNotInUse(58080, 58090, 'localhost', function(err, port) {
    if (err) {
      throw err;
    }

    portscanner.findAPortNotInUse(port + 1, 58090, 'localhost', function(err, securePort) {
      if (err) {
        throw err;
      }

      callback(port, securePort);
    });
  });
}
