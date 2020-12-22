var Promise = require('bluebird');
var path = require('path');
var fs = require('fs-extra');
var child_process = require('child_process');
var http = require('http');
var contentful = require('contentful');

Promise.config({
  // Enable warnings
  warnings: true,
  // Enable long stack traces
  longStackTraces: true,
  // Enable cancellation
  cancellation: true,
  // Enable monitoring
  monitoring: true,
  warnings: {
        wForgottenReturn: false
    }
});

var spaceManager = require('./space_manager');
var tools = require('./tools');

var clients = {};

/*
 * Instantiate a client for a Contentful space
 */
function getClient(spaceAlias) {
  if(clients[spaceAlias] == null) {
    spaceConfig = spaceManager.getSpace(spaceAlias);
    if (spaceConfig != null) {
      if (spaceConfig.id && spaceConfig.token) {
        clients[spaceAlias] = contentful.createClient({
          space: spaceConfig.id,
          accessToken: spaceConfig.token
        });
      } else {
        console.error("Incomplete configuration for space [%s]", spaceAlias);
      }
    } else {
      console.error("Could not find configuration for space [%s]", spaceAlias);
    }
  }

  return clients[spaceAlias];
}

/*
 * Parse and save the API Response to disk
 */
function saveResponseToDisk(spaceAlias, response) {
  // really convert to a JSON object
  res = JSON.parse(response.stringifySafe());
  mainPath = fs.mkdtempSync('/tmp/' + spaceAlias + "-");

  syncStep = [];

  // saving entries
  entries_path = mainPath + "/entries";
  fs.mkdirSync(entries_path);
  syncStep.push(writeEntriesToDisk(entries_path, res.entries));

  // saving assets
  assets_path = mainPath + "/assets";
  fs.mkdirSync(assets_path);
  syncStep.push(writeAssetsDescriptionsToDisk(assets_path, res.assets));

  // downloading assets
  media_path = mainPath + "/media";
  fs.mkdirSync(media_path);
  syncStep.push(downloadAssetsToDisk(media_path, res.assets));

  return Promise.all(syncStep).then(function(){
    // move the folder to its final location

    finalPath = "/data/" + spaceAlias;
    tools.spawn('rm', ['-rf', finalPath]).then(function(){
      tools.spawn('cp', ['-r', mainPath + "/", finalPath + "/"]).then(function(){
        fs.chmodSync(finalPath, 755);
      });
    });
  });
}

/*
 * Entries specific handling
 */
function writeEntriesToDisk(folder, entries) {
  console.log("%d entries found", entries.length);

  fileWrites = [];
  entries.forEach(function(entry){
    id = entry.sys.id;
    filename = folder + "/" + id + ".json";
    fileWrites.push(fs.writeFile(filename, JSON.stringify(entry)));
  });

  return Promise.all(fileWrites).then(function(){
    console.info("Entries saved to disk successfully");
  });
}

/*
 * Assets specific handling
 */
function writeAssetsDescriptionsToDisk(folder, assets) {
  console.log("%d assets found", assets.length);

  fileWrites = [];
  assets.forEach(function(asset){
    id = asset.sys.id;
    filename = folder + "/" + id + ".json";
    fileWrites.push(fs.writeFile(filename, JSON.stringify(asset)));
  });

  return Promise.all(fileWrites).then(function(){
    console.info("Assets descriptions saved to disk successfully");
  });
}

/*
 * Assets download
 */
function downloadFile(url, dest) {
  return new Promise(function(resolve, reject) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(resolve);
      });
    }).on('error', function(err){
      file.close();
      try { fs.unlink(dest); } catch(e){};
      request.end();
      console.error(err);
      reject(err);
    });

    file.on('error', function(err){
      file.close();
      try { fs.unlink(dest); } catch(e){};
      request.end();
      console.error(err);
      reject(err);
    });
  });
}

/*
 * Batch assets download
 */
function downloadAssetsToDisk(folder, assets) {
  var max = assets.length;
  var counter = 1;
  var header = "";
  return Promise.map(assets, (asset) => {
    id = asset.sys.id;
    var languages = [];
    for (var language in asset.fields.file) {
      languages.push(language);
    }
    return Promise.map(languages, (language) => {
      header = "(" + counter + "/" + max + ")[" + language + "] ";
      file = asset.fields.file[language];
      extension = path.extname(file.fileName);
      filename = folder + "/" + id + "." + language + extension;
      var url = "http:" + file.url;
      console.log(header + "downloading %s...", url);

      counter += 1;
      return downloadFile(url, filename).then(() => {
        console.log(header + "success!");
      }, (e) => {
        console.error(header + "error: %s", e);
      });
    }, {concurrency: 1});
  }, {concurrency: 1}).then(() => {
    console.info("Assets downloaded successfully");
  });
}

/*
 * Main process entry point
 * Will sync the content of a contentful space to the disk
 */
function syncSpace(spaceAlias) {
  return new Promise(function(resolve, reject){
    console.info("Syncing space [%s]...", spaceAlias);
    client = getClient(spaceAlias);
    if(client) {
      client.sync({initial: true}).then(function(response) {
        console.info("Response received from contentful API.");
        nextSyncToken = response.nextSyncToken;

        saveResponseToDisk(spaceAlias, response).then(function(){
          console.info("Completed.");
          resolve();
        });

      }, function(err) {
        console.error(err);
        reject();
      });
    } else {
      console.warn("Aborted.");
      reject();
    }
  });
}

module.exports = {
  sync: syncSpace
};
