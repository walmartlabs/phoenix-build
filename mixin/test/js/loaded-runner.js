/*global chai, mocha, mochaPhantomJS */
mocha.setup({
  ui: 'bdd',
  ignoreLeaks: true
});

if (window.chai) {
  window.expect = chai.expect;

  chai.Assertion.includeStack = true;
}

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'clock', 'sandbox', 'server', 'requests', 'on'],
  useFakeTimers: [10],
  useFakeServer: true
};

beforeEach(function() {
  var config = sinon.getConfig(sinon.config);
  config.injectInto = this;
  this.sandbox = sinon.sandbox.create(config);
});
afterEach(function() {
  this.clock.tick(1000);
  this.sandbox.verifyAndRestore();
});

$(document).ready(function() {
  // Pop off the stack to avoid an Zepto+IE10 bug where ready triggers immediately
  setTimeout(function() {
    if (window.mochaPhantomJS) {
      mochaPhantomJS.run();
    } else {
      sauceHelper(mocha.run());
    }
  });
});
