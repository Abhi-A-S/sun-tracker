# Sun Tracker Digital Twin

An interactive digital twin implementation for an IoT-based solar tracker. This project visualizes a solar tracker in a browser using Three.js, with the intended role of mirroring a real hardware tracker by displaying its 3D state, orientation, and future telemetry from field sensors.

The current application is a Vite-powered Three.js scene that loads a GLB model of the tracker, places it in a lit 3D environment, and provides orbit controls for inspection. It is structured as the visual foundation for connecting real-time IoT data from a solar tracking system.

## Project Purpose

Solar trackers improve photovoltaic panel efficiency by rotating panels toward the sun throughout the day. A digital twin gives operators and developers a virtual representation of the physical tracker so they can observe movement, validate control logic, inspect system state, and eventually compare expected behavior with live sensor readings.

This project is designed for:

- Visualizing a solar tracker as a 3D model in the browser.
- Representing the physical IoT solar tracker as a digital twin.
- Supporting future real-time telemetry such as azimuth, elevation, light intensity, voltage, current, temperature, and motor state.
- Providing a clean base for dashboards, simulation, diagnostics, and remote monitoring.

## Current Features

- Browser-based 3D solar tracker visualization.
- GLB model loading through Three.js `GLTFLoader`.
- Orbit controls for rotating, zooming, and inspecting the twin.
- Hemisphere and directional lighting.
- Shadow-enabled renderer and model materials.
- Ground plane and grid helper for spatial reference.
- Responsive canvas resizing.
- Vite development server and production build support.

## Tech Stack

- **Vite** - frontend build tool and development server.
- **Three.js** - 3D rendering engine.
- **GLTFLoader** - loads the solar tracker `.glb` model.
- **OrbitControls** - interactive camera controls.
- **JavaScript ES Modules** - application code structure.

## Repository Structure

```text
sun-tracker/
|-- public/
|   |-- favicon.svg
|   |-- icons.svg
|   `-- models/
|       `-- model.glb          # 3D solar tracker model
|-- src/
|   |-- assets/
|   |   |-- hero.png
|   |   |-- javascript.svg
|   |   `-- vite.svg
|   |-- counter.js
|   |-- main.js                # Three.js digital twin scene
|   `-- style.css
|-- index.html
|-- package.json
|-- package-lock.json
`-- README.md
```

## Getting Started

### Prerequisites

Install Node.js and npm before running the project.

Recommended:

- Node.js 20 or newer
- npm 10 or newer

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Vite will start a local development server, usually at:

```text
http://localhost:5173
```

### Build for Production

```bash
npm run build
```

The production-ready output will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Builds the application for production. |
| `npm run preview` | Serves the production build locally for testing. |

## How The Digital Twin Works

The application initializes a Three.js scene in `src/main.js` and renders a 3D representation of the solar tracker.

Main runtime flow:

1. Create a Three.js scene with a dark background.
2. Configure a perspective camera.
3. Create a WebGL renderer with antialiasing, shadows, tone mapping, and sRGB output.
4. Add hemisphere and directional lights.
5. Add a ground plane and grid helper.
6. Enable orbit controls for user inspection.
7. Load the tracker model from `public/models/model.glb`.
8. Scale, center, and place the model on the ground.
9. Enable shadows and double-sided rendering on model meshes.
10. Continuously render the scene in an animation loop.

## IoT Solar Tracker Context

In a complete IoT solar tracker system, the physical device may include:

- Light-dependent resistors or irradiance sensors for sunlight detection.
- Servo motors, stepper motors, or linear actuators for tracker movement.
- Microcontroller such as ESP32, Arduino, STM32, or Raspberry Pi Pico.
- Voltage and current sensors for panel output monitoring.
- Temperature and humidity sensors for environmental monitoring.
- Limit switches or encoders for mechanical position feedback.
- Communication using MQTT, HTTP, WebSocket, LoRa, Wi-Fi, or cellular modules.

The digital twin can consume this data and update the browser model to match the real tracker.

Example telemetry fields:

```json
{
  "trackerId": "tracker-001",
  "timestamp": "2026-05-15T10:30:00Z",
  "azimuthDeg": 128.4,
  "elevationDeg": 42.7,
  "panelVoltage": 18.6,
  "panelCurrent": 2.4,
  "powerWatts": 44.64,
  "irradiance": 812,
  "temperatureC": 34.2,
  "motorState": "tracking",
  "mode": "automatic"
}
```

## Suggested Digital Twin Architecture

```text
Physical Solar Tracker
        |
        | Sensor and actuator data
        v
Microcontroller / Edge Device
        |
        | MQTT, HTTP, or WebSocket
        v
Backend / IoT Broker
        |
        | Real-time telemetry stream
        v
Web Digital Twin
        |
        | 3D model update, status UI, alerts
        v
Operator / Developer
```

## Future Improvements

- Connect live IoT telemetry using MQTT over WebSocket or a REST API.
- Rotate the 3D tracker model based on real azimuth and elevation values.
- Add a dashboard for voltage, current, power, irradiance, and temperature.
- Add tracker operating modes: automatic, manual, parked, calibration, and fault.
- Add alerts for motor faults, low output, overheating, or sensor failure.
- Add historical charts for energy generation and tracker movement.
- Add sun-position simulation using latitude, longitude, date, and time.
- Add multiple tracker support for a solar farm layout.
- Add backend storage for telemetry and event logs.
- Add authentication for remote monitoring deployments.

## Model Asset

The 3D model is stored at:

```text
public/models/model.glb
```

Because files in Vite's `public/` directory are served from the web root, the model is loaded in code as:

```js
'/models/model.glb'
```

When replacing the model, keep the same file path or update the path in `src/main.js`.

## Development Notes

- Keep hardware telemetry units consistent, especially angles, voltage, current, and temperature.
- Prefer degrees for incoming IoT data and convert to radians only when applying rotations in Three.js.
- Normalize tracker states before rendering them in the UI.
- Add validation for incoming telemetry so invalid sensor data does not produce incorrect model movement.
- Keep the 3D model pivot points aligned with the real mechanical rotation axes for accurate twin behavior.

## Deployment

This project can be deployed as a static frontend after running:

```bash
npm run build
```

The generated `dist/` folder can be hosted on platforms such as:

- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting
- Nginx or Apache static hosting
- Any IoT dashboard server capable of serving static files

If live telemetry is added, make sure the frontend can reach the MQTT broker, WebSocket server, or API endpoint from the deployed environment.

## License

No license file is currently included. Add a license before publishing or distributing the project.
