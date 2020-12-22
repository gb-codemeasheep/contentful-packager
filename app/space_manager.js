var fs = require('fs-extra');
var spaceConfigFile = '/data/spaces.json';
var spacesList = null;

/*
 * Load specific space data from an alias
 * This will include keys
 */
function getSpace(spaceAlias) {
  config = null;

  loadSpaces().forEach(function(item){
    if(item.label == spaceAlias) {
      config = item;
      return false;
    }
  });

  return config;
}

/*
 * Load Contentful spaces config file
 */
function loadSpaces() {
  if (spacesList == null) {
    try{
      fs.accessSync(spaceConfigFile);
      data = require(spaceConfigFile);
      spacesList = data.spaces;
    }
    catch(err) {
      throw "Space configuration file not found or not accessible.";
    }
  }

  return spacesList;
}

module.exports = {
  loadSpaces: loadSpaces,
  getSpace: getSpace
};
