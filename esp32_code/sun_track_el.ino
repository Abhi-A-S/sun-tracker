#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT.h>

// ---------------- WiFi ----------------
const char* ssid = "present";
const char* password = "presentshake";

// ---------------- MQTT ----------------
const char* mqtt_server = "10.132.4.166";
const char* topic = "solartracker/data";
const char* commandTopic = "solartracker/commands";

WiFiClient espClient;
PubSubClient client(espClient);

// ---------------- LDR ----------------
const int LEFT_LDR = 34;
const int RIGHT_LDR = 35;

// ---------------- Servo ----------------
Servo servo;
const int SERVO_PIN = 13;

// ---------------- DHT22 ----------------
#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

// Servo starts at center (45°)
// Mechanical range: 15° - 75°
int angle = 45;
int targetAngle = 45;
bool autoMode = true;

unsigned long lastServoMove = 0;
const unsigned long SERVO_INTERVAL = 20;   // ms between steps

// ---------------- Tracking Parameters ----------------
const int STEP = 1;
const float TRACK_THRESHOLD = 0.08;
const int NIGHT_THRESHOLD = 2000;

// ------------------------------------------------------

void setServo(int servoAngle)
{
    servo.write(servoAngle);
}

int readAverage(int pin, int samples = 10)
{
    long total = 0;

    for (int i = 0; i < samples; i++)
    {
        total += analogRead(pin);
        delay(2);
    }

    return total / samples;
}

void connectWiFi()
{
    Serial.print("Connecting to WiFi");

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nWiFi Connected");
}

void connectMQTT()
{
    while (!client.connected())
    {
        Serial.print("Connecting MQTT... ");

        if (client.connect("esp32_solar"))
        {
            Serial.println("Connected");
            if (client.subscribe(commandTopic))
            {
                Serial.print("Subscribed to: ");
                Serial.println(commandTopic);
            }
            else
            {
                Serial.println("Failed to subscribe!");
            }
        }
        else
        {
            Serial.print("Failed, rc=");
            Serial.print(client.state());
            Serial.println(" Retrying...");
            delay(2000);
        }
    }
}

void callback(char* topic, byte* payload, unsigned int length)
{
    String message;

    for (unsigned int i = 0; i < length; i++)
        message += (char)payload[i];

    StaticJsonDocument<128> doc;

    if (deserializeJson(doc, message))
        return;

    if (!doc.containsKey("command"))
        return;

    String command = doc["command"].as<String>();

    if (command == "SET_MODE")
    {
        String mode = doc["mode"];
        Serial.print("Current Servo Angle: ");
        Serial.println(angle);

        if (mode == "AUTO")
        {
            autoMode = true;
            Serial.println("AUTO MODE");
        }
        else if (mode == "MANUAL")
        {
            autoMode = false;
            Serial.println("MANUAL MODE");
        }
    }

    else if (command == "SET_ANGLE")
    {
        if (!autoMode)
        {
            int trackerAngle = doc["angle"];

            targetAngle = trackerAngle + 45;
            targetAngle = constrain(targetAngle, 15, 75);

            Serial.print("Target Angle: ");
            Serial.println(targetAngle);
        }
    }
}

void setup()
{
    Serial.begin(115200);

    analogReadResolution(12); // 0-4095

    servo.setPeriodHertz(50);
    servo.attach(SERVO_PIN, 500, 2400);
    dht.begin();

    delay(1500);

    setServo(angle);

    connectWiFi();

    client.setServer(mqtt_server, 1883);
    client.setCallback(callback);

    connectMQTT();
}

void loop()
{
    if (!client.connected())
        connectMQTT();

    client.loop();

    int l = readAverage(LEFT_LDR);
    int r = readAverage(RIGHT_LDR);

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature))
        temperature = 0;

    if (isnan(humidity))
        humidity = 0;

    float average = (l + r) / 2.0;

    float normalized = 0;

    if ((l + r) != 0)
        normalized = (float)(l - r) / (float)(l + r);

    int oldAngle = angle;
    String direction = "CENTER";

    // ---------- Night Detection ----------
    if (autoMode)
    {
        if (average > NIGHT_THRESHOLD)
        {
            direction = "NIGHT";

            if (angle > 45)
                angle -= STEP;
            else if (angle < 45)
                angle += STEP;
        }
        else
        {
            if (normalized > TRACK_THRESHOLD)
            {
                direction = "LEFT";
                angle -= STEP;
            }
            else if (normalized < -TRACK_THRESHOLD)
            {
                direction = "RIGHT";
                angle += STEP;
            }
        }
    }
    else
    {
        direction = "MANUAL";

        if (millis() - lastServoMove >= SERVO_INTERVAL)
        {
            lastServoMove = millis();

            if (angle < targetAngle)
                angle++;
            else if (angle > targetAngle)
                angle--;

            angle = constrain(angle, 15, 75);
        }
    }

    angle = constrain(angle, 15, 75);

    bool moved = (angle != oldAngle);

    if (moved)
        setServo(angle);

    StaticJsonDocument<384> doc;

    doc["left"] = l;
    doc["right"] = r;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["average"] = round(average);
    doc["normalized"] = normalized;
    doc["direction"] = direction;
    int trackerAngle = angle - 45;
    doc["angle"] = trackerAngle;
    doc["moving"] = moved;
    doc["auto"] = autoMode;

    char buffer[384];
    serializeJson(doc, buffer);

    client.publish(topic, buffer);

    Serial.println(buffer);

    delay(200);
}