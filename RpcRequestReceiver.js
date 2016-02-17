
var amqp = require('amqplib');
var basename = require('path').basename;
var when = require('when');
var defer = when.defer;
var uuid = require('node-uuid');
var http = require('http');

var ch = null;


/*
* This is a Mapping from uuid (message identifier to the callback handler function).
*
* Whenever try to send a RPC style request, it will push a callback handler into this object.
*/
var msgCallbackHandler = {};
var asyncCallbackQueue = null;

function onMessageCallback(msg) {
    var corrId = msg.properties.correlationId;
    console.log("received callback msg for corrId:" + corrId)
    var handler = msgCallbackHandler[corrId];
    if(handler) {
        handler(msg.content.toString());
        delete msgCallbackHandler[corrId];
    } else {
        console.log("No handler for corrId:" + corrId);
    }
}

function start() {
    console.log("start to register into cloudamqp queue...");

    amqp.connect('amqp://yjoinmoy:INZGR8Esm-kgVfzCrvuZ0UJGYuRhqw_W@hyena.rmq.cloudamqp.com/yjoinmoy').then(function(conn) {
          console.log("Got Connection...");

          conn.createChannel().then(function(messageChannel) {
            console.log("Created Channel...");

            ch = messageChannel;

            var ok = ch.assertQueue('', {exclusive: true})
                .then(function(qok) { return qok.queue; });

            ok.then(function(queue) {
                ch.consume(queue, onMessageCallback, {noAck: true})
                  .then(function() {
                      asyncCallbackQueue = queue;
                      console.log("Aync callback queue is ready...");
                  });
            });
        });
    });
}

console.log('node.js application starting...');

function sendTaskToQueue(taskMsg, success, failure) {
    var corrId = uuid();

    msgCallbackHandler[corrId] = function(replyMsg) {
        console.log('[xxx] got reply:' + replyMsg);
        success && success(replyMsg);
    };

    ch.sendToQueue('rpc_queue', new Buffer(taskMsg), {
        correlationId: corrId, replyTo: asyncCallbackQueue
    });
}

var svr = http.createServer(function(req, resp) {
    console.log("start to initate a RPC call..");
    sendTaskToQueue('hey, here we goo..');
    resp.end('Hello, World! -- sent the job');
});

svr.listen(9000, function() {
    console.log('Node HTTP server is listening');
    start();
});