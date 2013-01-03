// Temporary Shim File for use while migrating from QUnit to Mocha
/*global chai */
function qunitShim() {
  var _currentTest,
      _describe = describe,
      fixture;

  beforeEach(function() {
    fixture = $('#qunit-fixture').html();
  });
  afterEach(function() {
    $('#qunit-fixture').html(fixture);
  });

  function emitQUnit() {
    if (_currentTest) {
      _describe(_currentTest.name, function() {
        var config = _currentTest.config;
        if (config && config.setup) {
          beforeEach(config.setup);
        }
        if (config && config.teardown) {
          afterEach(config.teardown);
        }

        _.each(_currentTest.tests, function(config) {
          it(config.msg, config.exec);
        });
      });
    }
    _currentTest = undefined;
  }

  window.describe = function(name, exec) {
    emitQUnit();
    _describe.call(this, name, exec);
  };

  window.test = function(msg, exec) {
    if (typeof exec === 'number') {
      exec = arguments[2];
    }

    if (_currentTest) {
      _currentTest.tests.push({msg: msg, exec: exec});
    } else {
      it(msg, exec);
    }
  };

  window.QUnit = {
    test: window.test,
    module: function(name, config) {
      emitQUnit();
      _currentTest = {
        name: name,
        config: config,
        tests: []
      };
    }
  };

  window.equal = chai.assert.equal;
  window.deepEqual = chai.assert.deepEqual;
  window.notEqual = chai.assert.notEqual;
  window.ok = chai.assert.ok;
}
