require('./setup.js');
var program = require('commander');
var spaceManager = require('./space_manager.js');
var syncManager = require('./sync_manager.js');
var archiveManager = require('./archive_manager.js');
var deployManager = require('./deploy_manager.js');

/*
 * Entry point for the CLI tool
 * Each subcommand is described in order to supply assistance with the --help flag
 */

process.on('SIGINT', function() {
  process.exit();
});

program
  .version("0.1");

program
  .command("list-spaces")
  .description("Lists all available space aliases")
  .action(function(options){
    spaces = spaceManager.loadSpaces();

    console.log("Known spaces:");
    spaces.forEach(function(item){
      console.log("- %s (%s)", item.label, item.id);
    });
  });

program
  .command("sync <space>")
  .description("Synchronise the packager with the latest data from contentful")
  .action(function(space, options){
    syncManager.sync(space);
  });

program
  .command("create <space>")
  .description("Create a package for the specified space")
  .action(function(space, options){
    archiveManager.create(space);
  });

program
  .command("deploy <space>")
  .description("Deploy a package for the specified space")
  .action(function(space, options){
    deployManager.deploy(space);
  });

program
  .command("pack <space>")
  .description("Sync, create and deploy a package for the specified space")
  .action(function(space, options){
    syncManager.sync(space).then(function(){
      // a timeout is necessary to give time for the fs stats to refresh somehow.
      setTimeout(function(){
        archiveManager.create(space).then(function(){
          deployManager.deploy(space).then(function(){
            console.info("Packing completed.");
          }, function(){
            console.error("Deployment of archive failed.");
          });
        }, function(){
          console.error("Creation of archive failed, aborting.");
        });
      }, 1000);
    }, function(){
      console.error("Synchronisation failed, aborting.");
    })
  });

try {
  program.parse(process.argv);
}
catch(err) {
  console.error(err);
  process.exit(1);
}
