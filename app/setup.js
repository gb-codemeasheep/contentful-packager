colors = require('colors');

colors.setTheme({
  info: 'cyan',
  warn: 'yellow',
  error: 'red'
});

/*
 * Adding a bit of CLI decoration to make the output more readable
 */

["info", "warn", "error"].forEach(function(method) {
  var oldMethod = console[method].bind(console);
  console[method] = function() {
    if(arguments.length > 0 && arguments[0] != null && arguments[0][method]) {
      arguments[0] = arguments[0][method]
    }

    oldMethod.apply(
      console,
      arguments
    );
  };
});
