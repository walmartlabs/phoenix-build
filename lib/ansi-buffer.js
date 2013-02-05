/**
 * Implements very limited ANSI cursor handlng, mostly tracking mocha's patterns
 */
function ANSIBuffer() {
  this.buffer = [];
}

ANSIBuffer.prototype.append = function(data) {
  var lines = data.toString().split(/\r\n|\n|\r/g);

  if (!lines[lines.length - 1]) {
    // Remove trailing new line as we account for that
    lines.pop();
  }

  lines.forEach(function(line) {
    // Replace lines as directed by the input
    var match = /\x1b\[(\d*)A\x1b\[2K/.exec(line);
    if (match) {
      var count = parseInt(match[1], 10) || 1;
      this.buffer.splice(-count, count);
    }
    this.buffer.push(line.replace(/\x1b\[(\d*)A\x1b\[2K/, ''));
  }, this);
};

ANSIBuffer.prototype.trim = function(remainder) {
  remainder = remainder || 0;

  var ret = this.buffer.slice(0, this.buffer.length - remainder);
  this.buffer = remainder ? this.buffer.slice(-remainder) : [];

  // If we know that the line is going to be replaced then don't output it yet
  if (/\u25E6/.test(ret[ret.length - 1])) {
    this.buffer.unshift(ret.pop());
  }

  ret.push('');
  return ret.join('\n');
};

ANSIBuffer.prototype.toString = function() {
  return this.buffer.join('\n');
};

module.exports = ANSIBuffer;
