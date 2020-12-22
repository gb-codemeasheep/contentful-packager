var Promise = require('bluebird');
var child_process = require('child_process');
var targz = require('targz');

/*
 * Utility function spawning a child process in a promise
 */
function spawn(command, args) {
  return new Promise(function(resolve, reject){
    handle = child_process.spawn(command, args);
    handle.on('close', function(code){
      if(code == 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

/*
 * Utility function compressing a target in a promise
 */
function compress(src, dest) {
  return new Promise(function(resolve, reject){
    targz.compress({
      src: src,
      dest: dest
    }, function(err){
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  spawn: spawn,
  compress: compress
}
