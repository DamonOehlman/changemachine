var debug = require('debug')('repl'),
    net = require('net'),
    repl = require('repl'),
    util = require('util'),
    machine = require('./machine');
    
// repl helpers taken from learnboost/cluster
// https://github.com/LearnBoost/cluster/blob/master/lib/plugins/repl.js

/**
 * Enable REPL with all arguments passed to `net.Server#listen()`.
 *
 * Examples:
 *
 *    cluster(server)
 *      .use(cluster.stats())
 *      .use(cluster.repl('/var/run/cluster'))
 *      .listen();
 *
 * In the terminal:
 *
 *    $ sudo telnet /var/run/cluster 
 *
 * @return {Function}
 * @api public
 */

exports = module.exports = function(){
  var args = arguments, server, sockets = [];

  if (!args.length) throw new Error('repl() plugin requires port/host or path');

  // TCP or unix-domain socket repl
  debug('creating repl server with args: ', args);
  server = net.createServer(function(sock){
    sockets.push(sock);
    var ctx = new repl.REPLServer('changemachine> ', sock, null, false, true).context;

    // augment socket to provide some formatting methods
    sock.title = function (str) {
        this.write('\n  \033[36m' + str + '\033[0m\n');
    };
    
    sock.row = function(key, val) {
        this.write('  \033[90m' + key + ':\033[0m ' + val + '\n');
    };
    
    // merge commands into context
    // executing in context of master
    Object.keys(exports).forEach(function(cmd){
        if (cmd !== 'define') {
              debug('registered command: ' + cmd);
            ctx[cmd] = function(){
              var args = Array.prototype.slice.call(arguments);
              args.unshift(sock);
              return exports[cmd].apply(sock, args);
            };
        }
    });
  });

  // Apply all arguments given
  server.listen.apply(server, args);
};
    
/**
 * Define function `name`, with the given callback
 * `fn(master, sock, ...)` and `description`.
 *
 * @param {String} name
 * @param {Function} fn
 * @param {String} desc
 * @return {Object} exports for chaining
 * @api public
 */

var define = exports.define = function(name, fn, desc){
  (exports[name] = fn).description = desc;
  return exports;
};

/**
 * Display commmand help.
 */

define('help', function(sock){
  sock.title('Commands');
  Object.keys(exports).forEach(function(cmd){
    if ('define' == cmd) return;

    var fn = exports[cmd],
        params = fn.toString().match(/^function +\((.*?)\)/)[1];
        
    params = params.split(/ *, */).slice(1);

    sock.row(
      cmd + '(' + params.join(', ') + ')'
      , fn.description);
  });
  sock.write('\n');
}, 'Display help information');

/** 
 * List the current machines
 */
 
define('list', function(sock) {
    var machines = machine.list();
    
    sock.title('Machines');
    
    if (machines.length > 0) {
        machines.forEach(function(machine) {
            sock.row(machine.id, machine.target);
        });
    }
    else {
        sock.write('  No machines active\n');
    }
    
    sock.write('\n');
}, 'Display active machines list');

define('stats', function(sock, machineId) {
    // get the requested machine
    var instance = machine.get(machineId);
    
    if (instance) {
        sock.title(instance.id);
        sock.write('  ' + util.inspect(instance.stats()) + '\n');
    }
    else {
        sock.write('  NOT FOUND\n');
    }
    
    sock.write('\n');
}, 'Get stats for the specified machine');

/**
 * Quit the repl
 */
define('quit', function(sock) {
    sock.end();
}, 'Quit the changemachine repl');