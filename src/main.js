import './style.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createDashboard } from './ui.js'
import {
  createSunSystem,
  updateSunPosition,  
} from './sun.js'

const socket = new WebSocket("ws://localhost:8081");
socket.onmessage = (event) => {

    const data = JSON.parse(event.data);

    console.log(data);

    if (panelObject) {
        panelObject.rotation.x =
            THREE.MathUtils.degToRad(data.angle);
    }

    dashboard.updateSensorData({
        angle: data.angle,
        left: data.left,
        right: data.right,
        difference: (data.normalized * 100).toFixed(1)
    });

    dashboard.updateSunTracking({
        trackingStatus:
            data.direction === "CENTER"
                ? "Centered"
                : data.direction === "LEFT"
                ? "Tracking Left"
                : "Tracking Right"
    });

    dashboard.updateConnectionLabels({
        pico: "Awaiting device",
        mqtt: "Connected",
        websocket: "Connected"
    });

};

let baseModel
let panelModel
let panelObject

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

dashboard = createDashboard({
    onTimeSpeedChange: (multiplier) => {
        if (sunSystem) {
            setSunTimeSpeed(sunSystem, multiplier);
        }
    },

    onManualSunPositionChange: (dayProgress) => {
        if (sunSystem) {
            currentSunState = setSunDayProgress(
                sunSystem,
                dayProgress
            );

            updateSunDashboard(currentSunState);
        }
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
  color: 0x666666,
  roughness: 0.8,
  metalness: 0.2
})

const plane = new THREE.Mesh(
  planeGeometry,
  planeMaterial
)

plane.rotation.x = -Math.PI / 2
plane.position.y = 0

plane.receiveShadow = true

scene.add(plane)

const gridHelper = new THREE.GridHelper(25, 50, 0x888888, 0x444444)

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
            child.material.side = THREE.DoubleSide
            child.material.flatShading = false
            child.material.needsUpdate = true

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

            child.castShadow = true
            child.receiveShadow = true
            child.material.side = THREE.DoubleSide
            child.material.flatShading = false
            child.material.needsUpdate = true

        }

    })

    console.log("Panel Loaded")

})

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
    trackingStatus:
    isModelReady
        ? "Centered"
        : "Waiting for model",
    dayProgress: sunState.dayProgress
  })
}

// Animation loop
function animate() {

    const delta = clock.getDelta();

    requestAnimationFrame(animate);

    currentSunState = updateSunPosition(sunSystem);

    dashboardUpdateElapsed += delta;

    if (dashboardUpdateElapsed >= 0.25) {

        updateSunDashboard(currentSunState);

        dashboardUpdateElapsed = 0;

    }

    controls.update();

    renderer.render(scene, camera);

}

animate()