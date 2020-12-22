var Promise = require('bluebird');
var crypto = require('crypto');
var fs = require('fs-extra');

/*
 * Simple tool to compute a checksum
 * Algo is freely selectable. Since this is only meant to be a simple
 * validity check and we do not expect external attacks via this vector
 * (since this is an internal CLI tool), MD5 is fine as a default
 */
function compute(file, algo) {
  return new Promise(function(resolve, reject){
    if(algo == null) {
      algo = 'md5'
    }
    var shasum = crypto.createHash(algo);
    var s = fs.ReadStream(file);
    s.on('data', function(d) { shasum.update(d); });
    s.on('end', function() {
      var d = shasum.digest('hex');
      resolve(d);
    });
  });
}

module.exports = {
  compute: compute
}
