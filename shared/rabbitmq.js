const amqp = require("amqplib");

async function setupRabbitMQ(queues) {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL || "amqp://localhost"
  );
  const channel = await connection.createChannel();
  for (const queue of queues) {
    await channel.assertQueue(queue);
  }
  return channel;
}

module.exports = { setupRabbitMQ };
