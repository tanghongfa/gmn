var amqp = require('amqplib');

function start() {
    amqp.connect('amqp://yjoinmoy:INZGR8Esm-kgVfzCrvuZ0UJGYuRhqw_W@hyena.rmq.cloudamqp.com/yjoinmoy').then(function(conn) {
        process.once('SIGINT', function() { conn.close(); });
        return conn.createChannel().then(function(ch) {
            var q = 'rpc_queue';
            var ok = ch.assertQueue(q, {durable: true, auto_delete: true});
            var ok = ok.then(function() {
              ch.prefetch(1);
              return ch.consume(q, reply);
            });
            return ok.then(function() {
              console.log(' [x] Awaiting RPC requests');
            });

            function reply(msg) {
                console.log("xxx...message received:", msg);
                var n = parseInt(msg.content.toString());
                console.log(' [.] fib(%d)', n);
                var response = 'here is the response... here we go...';
                ch.sendToQueue(msg.properties.replyTo,
                               new Buffer(response.toString()),
                               {correlationId: msg.properties.correlationId});
                ch.ack(msg);
            }
        });
    }).then(null, console.warn);
}

start();
