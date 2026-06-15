import * as THREE from 'three'

const DEFAULT_OPTIONS = {
  orbitRadius: 10,
  orbitHeight: 5,
  horizonHeight: 0.35,
  centerX: 0,
  centerZ: 0,
  dayDurationSeconds: 90,
  initialDayProgress: 0.62,
  timeSpeedMultiplier: 1
}

export function createSunSystem(scene, directionalLight, options = {}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options
  }

  const sunGroup = new THREE.Group()
  sunGroup.name = 'SimulatedSun'

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffc24a })
  )

  const glowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff8a1d,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  )

  const sunPointLight = new THREE.PointLight(0xffb347, 0.75, 28, 2)

  sunGroup.add(glowMesh, sunMesh, sunPointLight)
  scene.add(sunGroup)
  scene.add(createSunPathLine(config))

  if (directionalLight && !directionalLight.target.parent) {
    scene.add(directionalLight.target)
  }

  const sunSystem = {
    scene,
    directionalLight,
    sunGroup,
    dayProgress: config.initialDayProgress,
    dayDurationSeconds: config.dayDurationSeconds,
    timeSpeedMultiplier: config.timeSpeedMultiplier,
    autoTracking: true,
    config
  }

  updateSunPosition(sunSystem, 0)

  return sunSystem
}

export function updateSunPosition(sunSystem, deltaSeconds = 0) {
  const dayStep =
    (deltaSeconds * sunSystem.timeSpeedMultiplier) / sunSystem.dayDurationSeconds

  sunSystem.dayProgress =
    deltaSeconds === 0
      ? THREE.MathUtils.clamp(sunSystem.dayProgress, 0, 1)
      : wrapDayProgress(sunSystem.dayProgress + dayStep)

  const angles = calculateSunAngles(sunSystem.dayProgress)
  const position = calculateSunPosition(angles, sunSystem.config)

  sunSystem.sunGroup.position.copy(position)
  syncDirectionalLight(sunSystem, position, angles.elevation)

  return {
    ...angles,
    position,
    dayProgress: sunSystem.dayProgress,
    simulatedTime: formatSimulatedTime(sunSystem.dayProgress)
  }
}

export function updateTrackerRotation({
  trackerRoot,
  sunState,
  deltaSeconds,
  autoTracking
}) {
  if (!sunState) {
    return {
      alignment: 0,
      tiltAngle: 0,
      targetTiltAngle: 0
    }
  }

  const targetTiltAngle = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(sunState.azimuth, 90, 270, -65, 65),
    -65,
    65
  )
  const targetRoll = THREE.MathUtils.degToRad(targetTiltAngle)

  if (autoTracking) {
    const trackingStep = THREE.MathUtils.clamp(deltaSeconds * 0.65, 0, 1)

    if (trackerRoot) {
      trackerRoot.rotation.x = 0
      trackerRoot.rotation.y = -0.2
      trackerRoot.rotation.z = lerpAngle(trackerRoot.rotation.z, targetRoll, trackingStep)
    }
  }

  const currentRoll = trackerRoot ? trackerRoot.rotation.z : targetRoll
  const trackingError = Math.abs(THREE.MathUtils.radToDeg(angleDelta(currentRoll, targetRoll)))
  const alignment = THREE.MathUtils.clamp(100 - trackingError * 1.6, 0, 100)

  return {
    alignment,
    tiltAngle: THREE.MathUtils.radToDeg(currentRoll),
    targetTiltAngle
  }
}

export function calculateSunAngles(dayProgress) {
  const safeProgress = THREE.MathUtils.clamp(dayProgress, 0, 1)

  return {
    elevation: Math.sin(safeProgress * Math.PI) * 78,
    azimuth: 90 + safeProgress * 180
  }
}

export function setSunTimeSpeed(sunSystem, multiplier) {
  sunSystem.timeSpeedMultiplier = THREE.MathUtils.clamp(Number(multiplier) || 1, 0, 12)
}

export function setSunDayProgress(sunSystem, dayProgress) {
  sunSystem.dayProgress = THREE.MathUtils.clamp(Number(dayProgress) || 0, 0, 1)
  return updateSunPosition(sunSystem, 0)
}

export function setAutoTracking(sunSystem, enabled) {
  sunSystem.autoTracking = Boolean(enabled)
}

function createSunPathLine(config) {
  const points = []

  for (let i = 0; i <= 64; i += 1) {
    const progress = i / 64
    const angles = calculateSunAngles(progress)
    points.push(calculateSunPosition(angles, config))
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color: 0xffc66a,
    transparent: true,
    opacity: 0.38
  })

  const line = new THREE.Line(geometry, material)
  line.name = 'SunPathArc'

  return line
}

function calculateSunPosition(angles, config) {
  const elevation = THREE.MathUtils.degToRad(angles.elevation)
  const azimuth = THREE.MathUtils.degToRad(angles.azimuth)
  const horizontalRadius = config.orbitRadius * Math.cos(elevation)

  return new THREE.Vector3(
    config.centerX + Math.sin(azimuth) * horizontalRadius,
    config.horizonHeight + Math.sin(elevation) * config.orbitHeight,
    config.centerZ + Math.cos(azimuth) * horizontalRadius
  )
}

function syncDirectionalLight(sunSystem, position, elevation) {
  const { directionalLight } = sunSystem

  if (!directionalLight) {
    return
  }

  const lightStrength = THREE.MathUtils.mapLinear(elevation, 0, 78, 0.65, 2.1)

  directionalLight.position.copy(position)
  directionalLight.intensity = THREE.MathUtils.clamp(lightStrength, 0.45, 2.1)
  directionalLight.color.set(0xfff1c2)
  directionalLight.target.position.set(0, 0.7, 0)
  directionalLight.target.updateMatrixWorld()

  if (directionalLight.shadow) {
    directionalLight.shadow.needsUpdate = true
  }
}

function formatSimulatedTime(dayProgress) {
  const totalMinutes = 6 * 60 + Math.round(dayProgress * 12 * 60)
  const hours24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12

  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function wrapDayProgress(progress) {
  return ((progress % 1) + 1) % 1
}

function lerpAngle(current, target, amount) {
  return current + angleDelta(target, current) * amount
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current))
}
