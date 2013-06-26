/*global phantom */
var fs = require('fs'),
    system = require('system');

// CasperJS library
phantom.libPath = fs.absolute(system.args[0] + '/../');
phantom.casperPath = phantom.libPath + '/CasperJs';
phantom.injectJs(phantom.casperPath + '/bin/bootstrap.js');

var css = require(phantom.libPath + '/phantomcss.js'),
    test = require('./test/css-test.js');

var config = test.config(),

    port = phantom.args[0],
    securePort = phantom.args[1],
    platform = phantom.args[2],
    userAgent = phantom.args[3],
    dirname = platform + (/Android/.test(userAgent) ? '_android' : '_ios')
    width = config.width || 320,
    height = config.height || 480;

// Populate global variables
var casper = require('casper').create({
  logLevel: 'info',
  pageSettings: {
    userAgent: userAgent
  },
  viewportSize: {width: width, height: height}
});

css.init({
  screenshotRoot: './test/screenshots/' + dirname,
  failedComparisonsRoot: './build/css-failures/' + dirname,
  testRunnerUrl: 'http://localhost:' + port + '/ms_admin',
  fileNameGetter: function(root, filename){
    // Drop the counter from the file name. This means that all screenshots must have a unique id
    var name = root + '/' + filename;
    if (fs.isFile(name+'.png')){
      return name+'.diff.png';
    } else {
      return name+'.png';
    }
  }
});

casper.start();

test.test(casper, css, platform, port, securePort);

casper.
  then( function now_check_the_screenshots(){
    css.compareAll();
  }).
  run( function end_it(){
    console.log('\nTHE END.');
    phantom.exit(css.getExitStatus());
  });
