const express = require("express");
const redisClient = require("../shared/redis");
const { setupRabbitMQ } = require("../shared/rabbitmq");
const { promisify } = require("util");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3002;

const georadiusAsync = promisify(redisClient.georadius).bind(redisClient);
const getAsync = promisify(redisClient.get).bind(redisClient);

// RabbitMQ setup
const channelPromise = setupRabbitMQ(["ride_requests"]);

// API endpoint for ride requests
app.post("/ride/request", async (req, res) => {
  const { location } = req.body;

  if (!location) {
    return res.status(400).send("Missing required fields: location");
  }

  try {
    // Find nearby drivers
    const drivers = await georadiusAsync(
      "drivers",
      location.lng,
      location.lat,
      10,
      "km"
    );

    const availableDrivers = [];
    for (const driverId of drivers) {
      const driverData = await getAsync(`driver:${driverId}`);
      if (driverData && JSON.parse(driverData).available) {
        availableDrivers.push(driverId);
      }
    }

    // Publish ride request to RabbitMQ
    const channel = await channelPromise;
    channel.sendToQueue("ride_requests", Buffer.from(JSON.stringify(req.body)));

    // Respond with available drivers
    res.json({ availableDrivers });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing ride request");
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.send("Rider service is running");
});

app.listen(port, () => {
  console.log(`Rider service running on port ${port}`);
});
