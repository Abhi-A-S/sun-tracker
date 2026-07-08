const mqtt = require("mqtt");
const WebSocket = require("ws");

const mqttClient = mqtt.connect("mqtt://localhost:1883");

const wss = new WebSocket.Server({
    port: 8081
});

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

mqttClient.on("message", (topic, message) => {

    console.log("Topic:", topic);
    console.log("Payload:", message.toString());

    wss.clients.forEach(client => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
        }

    });

});

wss.on("connection", () => {
    console.log("Browser Connected");
});

console.log("WebSocket Server : ws://localhost:8081");