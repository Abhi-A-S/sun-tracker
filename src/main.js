import './style.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createDashboard } from './ui.js'
import {
  createSunSystem,
  setAutoTracking as setSunAutoTracking,
  setSunDayProgress,
  setSunTimeSpeed,
  updateSunPosition,
  updateTrackerRotation
} from './sun.js'

let solarTracker
let dashboard
let sunSystem
let currentSunState
let telemetryTimer
let dashboardUpdateElapsed = 0
let targetTiltAngle = 32
const clock = new THREE.Clock()
const trackerBounds = new THREE.Box3()
const GROUND_CLEARANCE = 0.02
const TRACKER_OFFSET_X = 0
const TRACKER_OFFSET_Z = -2
const SUN_OFFSET_Z = 7

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
  onTiltChange: (angle) => {
    setDashboardAutoTracking(false)
    applyPanelTilt(angle)
  },
  onStart: startTelemetrySimulation,
  onStop: stopTelemetrySimulation,
  onReset: resetTrackerDashboard,
  onAutoTrackingChange: (enabled) => {
    setDashboardAutoTracking(enabled)
  },
  onTimeSpeedChange: (multiplier) => {
    if (sunSystem) {
      setSunTimeSpeed(sunSystem, multiplier)
    }
  },
  onManualSunPositionChange: (dayProgress) => {
    if (sunSystem) {
      currentSunState = setSunDayProgress(sunSystem, dayProgress)
      updateSunDashboard(currentSunState, {
        tiltAngle: targetTiltAngle
      })
    }
  }
})

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

sunSystem = createSunSystem(scene, dirLight, {
  centerZ: SUN_OFFSET_Z
})
currentSunState = updateSunPosition(sunSystem, 0)
dashboard.setAutoTracking(sunSystem.autoTracking)
dashboard.setTimeSpeed(sunSystem.timeSpeedMultiplier)
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

)

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight

  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})

function applyPanelTilt(angle) {
  targetTiltAngle = angle

  if (solarTracker) {
    solarTracker.rotation.x = 0
    solarTracker.rotation.y = 0
    solarTracker.rotation.z = THREE.MathUtils.degToRad(angle)
    keepTrackerAboveGround()
  }
}

function keepTrackerAboveGround() {
  if (!solarTracker) {
    return
  }

  trackerBounds.setFromObject(solarTracker)
  solarTracker.position.y += GROUND_CLEARANCE - trackerBounds.min.y
}

function startTelemetrySimulation() {
  dashboard.updateConnectionLabels({
    esp32: 'ESP32 simulator',
    transport: 'WebSocket placeholder'
  })

  if (telemetryTimer) {
    return
  }

  pushDummyTelemetry()
  telemetryTimer = window.setInterval(pushDummyTelemetry, 1500)
}

function stopTelemetrySimulation() {
  if (telemetryTimer) {
    window.clearInterval(telemetryTimer)
    telemetryTimer = null
  }

  dashboard.updateConnectionLabels({
    esp32: 'ESP32 standby',
    transport: 'MQTT/WebSocket idle'
  })
}

function resetTrackerDashboard() {
  stopTelemetrySimulation()
  applyPanelTilt(0)
  setDashboardAutoTracking(true)

  if (sunSystem) {
    setSunTimeSpeed(sunSystem, 1)
    currentSunState = setSunDayProgress(sunSystem, sunSystem.config.initialDayProgress)
    dashboard.setTimeSpeed(1)
  }

  dashboard.updateStatus({
    online: true,
    connection: 'Reset to idle'
  })
  dashboard.updateConnectionLabels({
    esp32: 'ESP32 placeholder',
    transport: 'MQTT/WebSocket placeholder'
  })
}

function setDashboardAutoTracking(enabled) {
  if (sunSystem) {
    setSunAutoTracking(sunSystem, enabled)
  }

  if (dashboard) {
    dashboard.setAutoTracking(enabled)
  }
}

function pushDummyTelemetry() {
  // Future MQTT/WebSocket integration can replace this dummy payload with
  // real ESP32 telemetry before calling dashboard.updateSensorData().
  dashboard.updateSensorData({
    angle: targetTiltAngle,
    sunIntensity: calculateLdrSunIntensity(currentSunState)
  })
}

function updateSunDashboard(sunState, trackerState) {
  if (!sunState || !dashboard) {
    return
  }

  const isModelReady = Boolean(solarTracker)

  dashboard.updateSunTracking({
    elevation: sunState.elevation,
    azimuth: sunState.azimuth,
    trackingStatus: isModelReady
      ? sunSystem.autoTracking
        ? 'Auto tracking'
        : 'Manual control'
      : 'Waiting for model',
    dayProgress: sunState.dayProgress
  })

  dashboard.updateSensorData({
    sunIntensity: calculateLdrSunIntensity(sunState)
  })

  if (sunSystem.autoTracking && isModelReady) {
    targetTiltAngle = trackerState.tiltAngle
    dashboard.setTiltAngle(trackerState.tiltAngle)
  }
}

function calculateLdrSunIntensity(sunState) {
  if (!sunState || typeof sunState.elevation !== 'number') {
    return 0
  }

  return THREE.MathUtils.clamp(Math.round((sunState.elevation / 78) * 100), 0, 100)
}

// Animation loop
function animate() {
  const delta = clock.getDelta()
  
  requestAnimationFrame(animate)

  currentSunState = updateSunPosition(sunSystem, delta)

  const trackerState = updateTrackerRotation({
    trackerRoot: solarTracker,
    sunState: currentSunState,
    deltaSeconds: delta,
    autoTracking: sunSystem.autoTracking
  })

  keepTrackerAboveGround()

  dashboardUpdateElapsed += delta

  if (dashboardUpdateElapsed >= 0.25) {
    updateSunDashboard(currentSunState, trackerState)
    dashboardUpdateElapsed = 0
  }

  controls.update()

  renderer.render(scene, camera)
}

animate()
