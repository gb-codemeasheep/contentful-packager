var Promise = require('bluebird');
var path = require('path');
var fs = Promise.promisifyAll(require('fs-extra'));
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

var spaceManager = require('./space_manager');
var checksum = require('./checksum');

/*
 * S3 upload logic
 */
function uploadToBucket(src, dest) {
  return new Promise(function(resolve, reject){
    s3.putObject({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Body: fs.createReadStream(src),
      Key: dest
    }, function(err){
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getDateStamp() {
  var date = new Date();
  // TODO rewrite this with a proper formatting expression
  var stamp = date.getFullYear();
  var month = date.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  stamp += month;
  var day = date.getDate();
  if (day < 10) {
    day = "0" + day;
  }
  stamp += day;
  return stamp;
}

/*
 * Deploy a space backup to S3 for archiving
 */
function deploySpace(spaceAlias) {
  return new Promise(function(resolve, reject) {
    console.info("Deploying [%s] archive to S3", spaceAlias);
    archivePath = "/data/" + spaceAlias + ".tgz";

    fs.accessAsync(archivePath).then(function(){
      checksum.compute(archivePath).then(function(hash){
        newArchiveName = spaceAlias + "." + getDateStamp() +  "." + hash + ".tgz";
        console.info("Added checksum to file name: %s", newArchiveName);

        uploadToBucket(archivePath, spaceAlias + "/"+ newArchiveName).then(function(){
          console.info("Deployment completed successfully");
          resolve();
        }, function(err){
          console.error("Deployment failed: %s", err);
          reject();
        });
      });
    }, function(err){
      console.error("Archive not found for space [%s]: skipping", spaceAlias);
      reject();
    });
  });
}

module.exports = {
  deploy: deploySpace
};
