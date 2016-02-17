
var amqp = require('amqplib/callback_api');
var http = require('http');

var amqpConn = null;
function start() {
    amqp.connect('amqp://yjoinmoy:INZGR8Esm-kgVfzCrvuZ0UJGYuRhqw_W@hyena.rmq.cloudamqp.com/yjoinmoy', function(err, conn) {
        if (err) {
          console.error("[AMQP]", err.message);
          return setTimeout(start, 1000);
        }
        conn.on("error", function(err) {
          if (err.message !== "Connection closing") {
            console.error("[AMQP] conn error", err.message);
          }
        });
        conn.on("close", function() {
          console.error("[AMQP] reconnecting");
          return setTimeout(start, 1000);
        });
        console.log("[AMQP] connected");
        amqpConn = conn;
        whenConnected();
    });
}

function whenConnected() {
    startPublisher();
}

var pubChannel = null;
var offlinePubQueue = [];
function startPublisher() {
  amqpConn.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
      ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    while (true) {
      var m = offlinePubQueue.shift();
      if (!m) break;
      publish(m[0], m[1], m[2]);
    }
  });
}

function publish(exchange, routingKey, content) {
    try {
      pubChannel.publish(exchange, routingKey, content, { persistent: true },
                        function(err, ok) {
                          if (err) {
                            console.error("[AMQP] publish 1", err);
                            offlinePubQueue.push([exchange, routingKey, content]);
                            pubChannel.connection.close();
                          }
                        });
    } catch (e) {
      console.error("[AMQP] publish 2", e.message);
      offlinePubQueue.push([exchange, routingKey, content]);
    }
}

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

console.log('node.js application starting...');

var svr = http.createServer(function(req, resp) {
    publish("", "jobs", new Buffer("work work work"));
    resp.end('Hello, World! -- sent the job');
});

svr.listen(9000, function() {
    console.log('Node HTTP server is listening');
    start();
});