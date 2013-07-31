/**
 * Implements very limited ANSI cursor handlng, mostly tracking mocha's patterns
 */
function ANSIBuffer() {
  this.buffer = [];
}

ANSIBuffer.prototype.append = function(data) {
  var buffer = this.buffer;
  function lastComplete() {
    return /\n$/.test(buffer[buffer.length-1]);
  }

  //console.log('here!', data.toString().replace(/\r\n|\n|\r/g, '\\n\n').replace(/\x1b/g, '\\x1b'));
  var lines = data.toString().split(/\r\n|\n|\r/g);

  lines.forEach(function(line, index) {
    // Replace lines as directed by the input
    if (/\x1b\[2K/.test(line)) {
      buffer[buffer.length-1] = '';

      line = line.replace(/.*\x1b\[2K/, '');
    }
    if (/\x1b\[0G/.test(line)) {
      buffer[buffer.length-1] = '';
      line = line.replace(/.*\x1b\[0G/, '');
    }

    line = line.replace(/\x1bPASDASDSA/g, '\\x1b') + (index < lines.length-1 ? '\n' : '');
    //console.log(index, lines.length-1, index < lines.length-1, lastComplete(), line);
    if (!lastComplete()) {
      buffer[buffer.length-1] += line;
    } else {
      buffer.push(line);
    }
  }, this);
};

ANSIBuffer.prototype.trim = function(remainder) {
  remainder = remainder || 0;

  var ret = this.buffer.slice(0, this.buffer.length - remainder);
  this.buffer = remainder ? this.buffer.slice(-remainder) : [];

  // If we know that the line is going to be replaced then don't output it yet
  if (!/\n/.test(ret[ret.length - 1])) {
    this.buffer.unshift(ret.pop());
  }

  return ret.join('');
};

ANSIBuffer.prototype.toString = function() {
  return this.buffer.join('');
};

module.exports = ANSIBuffer;
