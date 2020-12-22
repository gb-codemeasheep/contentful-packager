var Promise = require('bluebird');
var path = require('path');
var fs = Promise.promisifyAll(require('fs-extra'));

var spaceManager = require('./space_manager');
var checksum = require('./checksum');
var tools = require('./tools');

function copyAssetFiles(mediaPath, targetPath) {
  return new Promise(function(resolve, reject){
    console.info("Copying assets files...");
    tasks = [];
      fs.walk(mediaPath, err=>{
        if(err){
            console.error(err);
            reject(err);
        }
      })
      .on('data', function(item){
        if (item.path != mediaPath) {
          tasks.push(fs.copyAsync(item.path, targetPath + "/" +path.basename(item.path)));
        }
      })
      .on('end', function() {
        Promise.all(tasks).then(function(){
          console.info("Assets copy completed.");
          resolve();
        });
      });
  });
}

function getObjType(obj) {
  type = (obj && obj.sys && obj.sys.type) ? obj.sys.type : typeof(obj);
  if (type == "object" && Object.prototype.toString.call(obj) == '[object Array]') {
    type = "array";
  }

  return type;
}

/*
 * Asset specific handling
 */
function processAsset(asset) {
  assetId = asset.sys.id;
  for(locale in asset.fields.file) {
    // remove the URL since we don't want developers to use it
    delete(asset.fields.file[locale].url);
    // correct the filename to match the renamed format
    asset.fields.file[locale].fileName = assetId + "." + locale + path.extname(asset.fields.file[locale].fileName);
  }
  return asset;
}

/*
 * Specialize handling based on data type
 */
function processObj(obj) {
  type = getObjType(obj);
  switch(type) {
    case "Entry":
      return processEntry(obj)
    case "Asset":
      return processAsset(obj);
    case "array":
      return obj.map(function(item){
        return processObj(item);
      });
    default:
      return obj;
  }
}

function processField(field) {
  for(locale in field) {
    field[locale] = processObj(field[locale]);
  }
  return field;
}

function processEntry(entry) {
  for(field in entry.fields) {
    entry.fields[field] = processField(entry.fields[field]);
  }
  return entry;
}

function toJson(data) {
  return JSON.stringify(data, null, "  ");
}

function updateAssetRecords(data) {
  return processEntry(data);
}

/*
 * Handles the generation of the entries data file
 */
function buildDataFile(entriesPath, buildPath) {
  return new Promise(function(resolve, reject){
    var paths = [];
    var lines = [];
    fs.walk(entriesPath)
      .on('data', (item) => {
        if (item.path != entriesPath) {
          paths.push(item.path);
        }
      }).on('end', () => {
        var lastRecord = paths[paths.length - 1];
        Promise.map(paths, (path) => {
          // OUTPUT TRANSFORMED ENTRY DATA
          return fs.readJsonAsync(path).then(function(entryData){
            lines.push('"' + entryData.sys.id + '":' + JSON.stringify(updateAssetRecords(entryData)));
          }, err => {
            console.error(err)
          });
        }, {concurrency: 1}).then(() => {
          // add all the entries
          var json = "{\"entries\":{\n";
          json += lines.join(",\n");
          json += "\n}\n}";
          // WRITE data.json
          fs.writeFileAsync(buildPath + "/data.json", json).then(() => {
            console.info("Updated entries' asset paths");
            resolve();
          }).catch(err => {
            console.error(err);
            return reject(err);
          })
        }).catch(err => {
          reject(err);
        })
      });
  });
}

/*
 * Main work function, splits the assets processing and entries processing
 */
function buildDataBundle(space) {
  dataPath = "/data/" + space;
  buildPath = fs.mkdtempSync('/tmp/' + space + "-");

  var tasks = [];

  // DEBUG
  tasks.push(copyAssetFiles(dataPath + "/media", buildPath));
  tasks.push(buildDataFile(dataPath + "/entries", buildPath));

  return Promise.all(tasks).then(function(){
    return buildPath;
  }).catch(err=>{
    throw err;
  })
}

/*
 * Creates an archive out of a Contentful space.
 * The archive will contain one JSON data file representing the entries
 * as well as all the assets stored in the space.
 */
function createSpacePackage(space) {
  return new Promise(function(resolve, reject) {
    // just keep it simple for now and archive the entire folder

    console.info("Creating archive for space [%s]", space);

    archivePath = "/data/" + space + ".tgz";

    buildDataBundle(space).then(function(buildPath) {
      tools.compress(buildPath, archivePath).then(function(){
        console.info("Archive created: %s", archivePath);
        resolve();
      },
      function(err){
        console.error("Archive creation failed! %s", err);
        reject();
      });
    });
  });
}

module.exports = {
  create: createSpacePackage
}
