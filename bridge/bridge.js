const mqtt = require("mqtt");
const WebSocket = require("ws");

const mqttClient = mqtt.connect("mqtt://localhost:1883");

const wss = new WebSocket.Server({
    port: 8081
});

// ---------------- MQTT ----------------

mqttClient.on("connect", () => {

    console.log("MQTT Connected");

    mqttClient.subscribe("solartracker/data", (err) => {

        if (err) {
            console.error(err);
        } else {
            console.log("Subscribed to solartracker/data");
        }

    });

});

// MQTT → Browser
mqttClient.on("message", (topic, message) => {

    console.log("Topic:", topic);
    console.log("Payload:", message.toString());

    wss.clients.forEach(client => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
        }

    });

});

// ---------------- WebSocket ----------------
wss.on("connection", (ws) => {

    console.log("Browser Connected");

    ws.on("message", (message) => {

        console.log("Received from Browser:", message.toString());

        mqttClient.publish(
            "solartracker/commands",
            message.toString()
        );

        console.log("Published to MQTT");

    });

});

console.log("WebSocket Server : ws://localhost:8081");