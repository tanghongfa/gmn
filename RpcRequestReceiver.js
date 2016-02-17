
var amqp = require('amqplib');
var basename = require('path').basename;
var when = require('when');
var defer = when.defer;
var uuid = require('node-uuid');
var http = require('http');

function start() {
    amqp.connect('amqp://yjoinmoy:INZGR8Esm-kgVfzCrvuZ0UJGYuRhqw_W@hyena.rmq.cloudamqp.com/yjoinmoy').then(function(conn) {
      return when(conn.createChannel().then(function(ch) {
        var answer = defer();
        var corrId = uuid();
        function maybeAnswer(msg) {
          if (msg.properties.correlationId === corrId) {
            answer.resolve(msg.content.toString());
          }
        }

        var ok = ch.assertQueue('', {exclusive: true})
          .then(function(qok) { return qok.queue; });

        ok = ok.then(function(queue) {
          return ch.consume(queue, maybeAnswer, {noAck: true})
            .then(function() { return queue; });
        });

        ok = ok.then(function(queue) {
          console.log(' [x] Requesting fib');
          ch.sendToQueue('rpc_queue', new Buffer('hello world message from RPC client'), {
            correlationId: corrId, replyTo: queue
          });
          return answer.promise;
        });

        return ok.then(function(respMsg) {
          console.log(' [.] Got response', respMsg);
        });
      })).ensure(function() { conn.close(); });
    }).then(null, console.warn);
}

console.log('node.js application starting...');

var svr = http.createServer(function(req, resp) {

    console.log("start to initate a RPC call..");
    resp.end('Hello, World! -- sent the job');

});

svr.listen(9000, function() {
    console.log('Node HTTP server is listening');
    start();
});