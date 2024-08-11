const express = require("express");
const redisClient = require("../shared/redis");
const { setupRabbitMQ } = require("../shared/rabbitmq");
const { promisify } = require("util");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3001;

const geoaddAsync = promisify(redisClient.geoadd).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

// RabbitMQ setup
const channelPromise = setupRabbitMQ(["driver_updates"]);

// API endpoint for updating driver location
app.post("/driver/update", async (req, res) => {
  const { driverId, location, available } = req.body;

  if (!driverId || !location || available === undefined) {
    return res
      .status(400)
      .send("Missing required fields: driverId, location, available");
  }

  try {
    // Update driver location in Redis
    await geoaddAsync("drivers", location.lng, location.lat, driverId);
    await setAsync(`driver:${driverId}`, JSON.stringify({ available }));

    // Publish to RabbitMQ
    const channel = await channelPromise;
    channel.sendToQueue(
      "driver_updates",
      Buffer.from(JSON.stringify(req.body))
    );

    res.status(200).send("Driver update processed successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing driver update");
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.send("Driver service is running");
});

app.listen(port, () => {
  console.log(`Driver service running on port ${port}`);
});
