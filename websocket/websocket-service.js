const http = require("http");
const WebSocket = require("ws");
const { setupRabbitMQ } = require("../shared/rabbitmq");

const port = process.env.PORT || 3003;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// RabbitMQ setup
const channelPromise = setupRabbitMQ(["driver_updates", "ride_requests"]);

// Handle incoming WebSocket connections
wss.on("connection", async (ws) => {
  const channel = await channelPromise;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "driver_update" || data.type === "ride_request") {
      channel.sendToQueue(
        data.type === "driver_update" ? "driver_updates" : "ride_requests",
        Buffer.from(message)
      );
    }
  });

  // Optionally, listen to RabbitMQ queues and send updates to the client
  channel.consume("driver_updates", (msg) => {
    if (msg !== null) {
      ws.send(msg.content.toString());
      channel.ack(msg);
    }
  });

  channel.consume("ride_requests", (msg) => {
    if (msg !== null) {
      ws.send(msg.content.toString());
      channel.ack(msg);
    }
  });
});

// Start the WebSocket server
server.listen(port, () => {
  console.log(`WebSocket service running on port ${port}`);
});
