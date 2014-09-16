"use strict";

//Dependencies
var app                   = require('express')(),
    server                = require('http').Server(app),
    _                     = require('underscore'),
    io                    = require('socket.io')(server),
    redis                 = require('redis'),
    moment                = require('moment'),
    yaml                  = require('js-yaml'),
    fs                    = require('fs'),
    crypto                = require('crypto');

//Configuation
var pubsub_prefix         = 'socketio.',
    redis_conf            = yaml.safeLoad(fs.readFileSync('../conf/redis.yml', 'utf8')),
    node_env              = process.env.NODE_ENV            || 'development',
    port                  = process.env.REDIS_PORT          || redis_conf[node_env]['port'],
    host                  = process.env.REDIS_HOST          || redis_conf[node_env]['host'],
    commander_redis       = redis.createClient(port, host),
    subscriber_redis      = redis.createClient(port, host),
    commander_connected   = false,
    subscriber_connected  = false,
    commander_to_exec     = [];

var log = function(msg) {console.log('['+moment().format('h:mm:ss a')+'] '+msg);};

// Not binding the 'error' event will cause node to stop when Redis is unreachable
commander_redis.on('error',   function (err)  {log('La connection à Redis a échoué: ['+err+']');});
subscriber_redis.on('error',  function (err)  {log('La connection à Redis a échoué: ['+err+']');});

var commander_save_job =      function(key, string) {
  if (commander_redis.connected)
  {
    commander_redis.HSET('jobs', key, string);
    return true;
  }
  else
  {
    commander_to_exec.push({key:key, string:string})
    return false;
  }
}
var subscriber_publish_job =  function(string)      {
  if (subscriber_redis.connected)
    subscriber_redis.publish('jobs', 'New job available');
}


var stackJobs = function(datas) {
  for (var i = datas.length - 1; i >= 0; i--) {
    var key = crypto.createHash('md5').update(JSON.stringify(datas[i])).digest("hex");
    var opts = {  params: datas[i].params,
                  bin: datas[i].bin,
                  state: 'not queued',
                  key: key
               };
    // commander_save_job(key, JSON.stringify(opts));
    // subscriber_publish_job();
    log('registered: '+opts.bin+' '+opts.params.join(' '));
  }
};


commander_redis.on('ready',  function ()  {log('redis est prêt à recevoir des requêtes.');
  while (commander_to_exec.length > 0)
  {
    var todo = commander_to_exec.pop();
    if (commander_save_job(todo.key, todo.string))
      subscriber_publish_job();
  }
});

io.on('connection', function (socket) {
  socket.on('stack_a_job', function (datas, reply)
  {
      stackJobs(datas);
      reply('Got it.');
  });
});
server.listen(8811, '0.0.0.0');
log("listenning on 0.0.0.0:8811");
