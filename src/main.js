import './style.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createDashboard } from './ui.js'
import {
  createSunSystem,
  updateSunPosition, 
  updateHardwareSun
} from './sun.js'

import { CSS2DRenderer, CSS2DObject } from
'three/examples/jsm/renderers/CSS2DRenderer.js';

let lastAutoMode = true;
const socket = new WebSocket("ws://localhost:8081");

window.socket = socket;

socket.onopen = () => {

    console.log("WebSocket Connected");

};

socket.onclose = () => {

    console.log("WebSocket Disconnected");

};

function sendCommand(command)
{

    if (socket.readyState !== WebSocket.OPEN)
        return;

    socket.send(JSON.stringify(command));

}

socket.onerror = (err) => {
    console.error("WebSocket Error:", err);
};

socket.onmessage = (event) => {

    const data = JSON.parse(event.data);

    if (panelLabel) {

        panelLabel.element.innerHTML =
            `Angle: ${data.angle}°`;

    }

    if (dhtLabel) {

        dhtLabel.element.innerHTML =
            `🌡 ${data.temperature.toFixed(1)}°C<br>
            💧 ${data.humidity.toFixed(1)}%`;

    }

    console.log(data);

    if (panelObject) {
        panelObject.rotation.x =
            THREE.MathUtils.degToRad(data.angle);
    }

    updateHardwareSun(
        sunSystem,
        data.angle,
        data.direction === "NIGHT"
    );

    dashboard.updateSensorData({
        angle: data.angle,
        left: data.left,
        right: data.right,
        difference: (data.normalized * 100).toFixed(1),
        temperature: data.temperature,
        humidity: data.humidity
    });

    dashboard.updateSunTracking({

        elevation:
            data.direction === "NIGHT"
                ? -5
                : 45,

        azimuth: data.angle,

        trackingStatus:
            data.direction === "CENTER"
                ? "Centered"
                : data.direction === "LEFT"
                ? "Tracking Left"
                : data.direction === "RIGHT"
                ? "Tracking Right"
                : "Night Mode"

    });

    dashboard.updateConnectionLabels({
        pico: "Awaiting device",
        mqtt: "Connected",
        websocket: "Connected"
    });

    // AUTO -> MANUAL
    if (lastAutoMode && !data.auto)
    {
        dashboard.setManualAngle(data.angle);
    }

    // MANUAL -> AUTO
    if (!lastAutoMode && data.auto)
    {
        dashboard.setManualAngle(data.angle);
    }

    lastAutoMode = data.auto;

    dashboard.updateTrackingMode(data.auto);

};

let baseModel
let panelModel
let panelObject
let dhtModel

let dashboard
let sunSystem
let currentSunState
let dashboardUpdateElapsed = 0
let targetTiltAngle = 32
const clock = new THREE.Clock()
const TRACKER_OFFSET_X = 0
const TRACKER_OFFSET_Z = 0
const SUN_OFFSET_Z = 0
const MODEL_SCALE = 0.02

let panelLabel;
let dhtLabel;

let modelColor = 0x888888;

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

camera.position.set(3, 3, 6)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

document.body.innerHTML = ''
document.body.appendChild(renderer.domElement)


const labelRenderer = new CSS2DRenderer();

labelRenderer.setSize(window.innerWidth, window.innerHeight);

labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.pointerEvents = "none";

document.body.appendChild(labelRenderer.domElement);

dashboard = createDashboard({

    onModeChange: (mode) => {

        sendCommand({

            command: "SET_MODE",

            mode

        });

    },

    onAngleChange: (angle) => {

        sendCommand({

            command: "SET_ANGLE",

            angle

        });

    }

});

dashboard.updateConnectionLabels({
  esp32: 'ESP32 placeholder',
  transport: 'MQTT/WebSocket placeholder'
})

// Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3)
scene.add(hemiLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)

dirLight.position.set(5, 10, 7)

dirLight.castShadow = true
dirLight.shadow.mapSize.width = 2048
dirLight.shadow.mapSize.height = 2048

dirLight.shadow.camera.near = 0.5
dirLight.shadow.camera.far = 50
dirLight.shadow.bias = -0.0005

scene.add(dirLight) 
// Constant fill light
const fillLight = new THREE.DirectionalLight(0xffffff, 0.5)

fillLight.position.set(-8, 12, -8)

fillLight.castShadow = false

scene.add(fillLight)

sunSystem = createSunSystem(scene, dirLight, {
  centerZ: SUN_OFFSET_Z
})
currentSunState = updateSunPosition(sunSystem, 0)
updateSunDashboard(currentSunState, {
  tiltAngle: targetTiltAngle
})

// Ground Plane
const planeGeometry = new THREE.PlaneGeometry(25, 25)

const planeMaterial = new THREE.MeshStandardMaterial({
    color: modelColor,
    roughness: 1.0,
    metalness: 0.0
});

const plane = new THREE.Mesh(
  planeGeometry,
  planeMaterial
)

plane.rotation.x = -Math.PI / 2
plane.position.y = 0

plane.receiveShadow = true

scene.add(plane)

const gridHelper = new THREE.GridHelper(
    25,
    50,
    0x777777,
    0x2f2f2f
);

gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.45;

scene.add(gridHelper)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0)
controls.enablePan = true
controls.minDistance = 2
controls.maxDistance = 20
controls.update()

// Loader
const loader = new GLTFLoader()
/*
loader.load(

  '/models/model.glb',

  // Success
  (gltf) => {

    solarTracker = gltf.scene

    scene.add(solarTracker)

    // Scale first
    solarTracker.scale.setScalar(5)

    // Bounding box
    const box = new THREE.Box3().setFromObject(solarTracker)

    const center = box.getCenter(new THREE.Vector3())

    // Center model
    solarTracker.position.x += TRACKER_OFFSET_X - center.x
    solarTracker.position.z += TRACKER_OFFSET_Z - center.z

    // Put on ground
    solarTracker.position.y -= box.min.y

    // Shadows
    solarTracker.traverse((child) => {

      if (child.isMesh) {

        child.castShadow = true
        child.receiveShadow = true

        child.material.side = THREE.DoubleSide

        child.material.flatShading = false
        child.material.needsUpdate = true

      }

    })

    applyPanelTilt(targetTiltAngle)

    window.__trackerDebug = { THREE, solarTracker, scene, sunSystem }
    console.log('Model Loaded')

  },

  // Progress
  (xhr) => {

    console.log((xhr.loaded / xhr.total) * 100 + '% loaded')

  },

  // Error
  (error) => {

    console.error('Error loading model:', error)

  }

)*/

loader.load('/models/Base.glb', (gltf) => {

    baseModel = gltf.scene

    scene.add(baseModel)

    baseModel.scale.setScalar(MODEL_SCALE)
    baseModel.rotation.y = THREE.MathUtils.degToRad(90)

    const box = new THREE.Box3().setFromObject(baseModel)
    const center = box.getCenter(new THREE.Vector3())

    baseModel.position.x += TRACKER_OFFSET_X - center.x
    baseModel.position.z += TRACKER_OFFSET_Z - center.z
    baseModel.position.y -= box.min.y

    baseModel.traverse((child) => {

        if (child.isMesh) {

            child.castShadow = true
            child.receiveShadow = true
            child.material = new THREE.MeshStandardMaterial({
                color: modelColor,
                roughness: 0.6,
                metalness: 0.15
            });

            child.castShadow = true;
            child.receiveShadow = true;

        }

    })

    console.log("Base Loaded")

})

loader.load('/models/Panel.glb', (gltf) => {

    panelModel = gltf.scene

    panelObject = panelModel.getObjectByName("panel")

    scene.add(panelModel)

    panelModel.scale.setScalar(MODEL_SCALE)
    panelModel.rotation.y = THREE.MathUtils.degToRad(90)

    const box = new THREE.Box3().setFromObject(panelModel)
    const center = box.getCenter(new THREE.Vector3())

    panelModel.position.x += TRACKER_OFFSET_X - center.x
    panelModel.position.z += TRACKER_OFFSET_Z - center.z
    panelModel.position.y -= box.min.y
    panelModel.position.y += 2.2

    panelModel.traverse((child) => {

        if (child.isMesh) {

            child.material = new THREE.MeshStandardMaterial({
                color: modelColor,
                roughness: 0.6,
                metalness: 0.15
            });

            child.material.side = THREE.DoubleSide;

            child.castShadow = true;
            child.receiveShadow = true;

        }

    })

    console.log("Panel Loaded")
    
    const div = document.createElement("div");
    div.className = "floatingLabel";
    div.innerHTML = "Angle: 0°";

    panelLabel = new CSS2DObject(div);

    panelLabel.position.set(80, 0.25, 0);

    panelModel.add(panelLabel);

})

loader.load('/models/dht22_lowpoly.glb', (gltf) => {

    dhtModel = gltf.scene;

    scene.add(dhtModel);

    dhtModel.scale.setScalar(15);

    dhtModel.rotation.y = THREE.MathUtils.degToRad(90);

    const box = new THREE.Box3().setFromObject(dhtModel);
    const center = box.getCenter(new THREE.Vector3());

    dhtModel.position.x += TRACKER_OFFSET_X - center.x;
    dhtModel.position.z += TRACKER_OFFSET_Z - center.z;
    dhtModel.position.y -= box.min.y;

    // -------- Position beside the tracker --------
    dhtModel.position.x = 0;
    dhtModel.position.y = 1.75;
    dhtModel.position.z = -1.4;
    dhtModel.rotation.y = THREE.MathUtils.degToRad(180);
    dhtModel.rotation.z = THREE.MathUtils.degToRad(270);
    // ---------------------------------------------

    dhtModel.traverse((child) => {

        if (child.isMesh) {

            child.material = new THREE.MeshStandardMaterial({

                color: modelColor,
                roughness: 0.75,
                metalness: 0.05

            });

            child.castShadow = true;
            child.receiveShadow = true;

        }

    });

    console.log("DHT22 Loaded");

    const div = document.createElement("div");
    div.className = "floatingLabel";
    div.innerHTML =
    `Temp: --°C<br>Humidity: --%`;

    dhtLabel = new CSS2DObject(div);

    dhtLabel.position.set(0.035, 0, 0);

    dhtModel.add(dhtLabel);

});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight

  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})

function setDashboardAutoTracking(enabled) {
  if (sunSystem) {
    setSunAutoTracking(sunSystem, enabled)
  }
} 

function updateSunDashboard(sunState, trackerState) {
  if (!sunState || !dashboard) {
    return
  }

  const isModelReady = Boolean(panelObject)

  dashboard.updateSunTracking({
      elevation: sunState.elevation,
      azimuth: sunState.azimuth,
      dayProgress: sunState.dayProgress
  })
}

// Animation loop
function animate() {

    const delta = clock.getDelta();

    requestAnimationFrame(animate);

    // currentSunState = updateSunPosition(sunSystem);

    // dashboardUpdateElapsed += delta;

    // if (dashboardUpdateElapsed >= 0.25) {

    //     updateSunDashboard(currentSunState);

    //     dashboardUpdateElapsed = 0;

    // }

    controls.update();

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

}

animate()