import * as THREE from 'three'
import * as SunCalc from "suncalc";

const LATITUDE = 12.9716;
const LONGITUDE = 77.5946;

const DEFAULT_OPTIONS = {
    orbitRadius: 10,
    horizonHeight: 0.35,
    centerX: 0,
    centerZ: 0
};

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
    autoTracking: true,
    config
  }

  updateSunPosition(sunSystem, 0)

  return sunSystem
}

export function updateSunPosition(sunSystem) {

    const angles = calculateSunAngles();

    const position = calculateSunPosition(
        angles,
        sunSystem.config
    );

    sunSystem.sunGroup.position.copy(position);

    syncDirectionalLight(
        sunSystem,
        position,
        angles.elevation
    );

    return {
        ...angles,
        position,
        currentTime: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

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
    THREE.MathUtils.mapLinear(
      sunState.azimuth,
      90,
      270,
      -65,
      65
    ),
    -65,
    65
  )

  const targetRoll = -THREE.MathUtils.degToRad(targetTiltAngle)

  if (autoTracking && trackerRoot) {

    const trackingStep = THREE.MathUtils.clamp(
      deltaSeconds * 0.65,
      0,
      1
    )

    trackerRoot.rotation.x = lerpAngle(
      trackerRoot.rotation.x,
      targetRoll,
      trackingStep
    )

  }

  const currentRoll = trackerRoot
    ? trackerRoot.rotation.x
    : targetRoll

  const trackingError = Math.abs(
    THREE.MathUtils.radToDeg(
      angleDelta(currentRoll, targetRoll)
    )
  )

  const alignment = THREE.MathUtils.clamp(
    100 - trackingError * 1.6,
    0,
    100
  )

  return {
    alignment,
    tiltAngle: THREE.MathUtils.radToDeg(currentRoll),
    targetTiltAngle
  }
}
  
export function calculateSunAngles() {

    const now = new Date();

    const position = SunCalc.getPosition(
        now,
        LATITUDE,
        LONGITUDE
    );

    return {

        elevation: THREE.MathUtils.radToDeg(position.altitude),

        azimuth: THREE.MathUtils.euclideanModulo(
                      THREE.MathUtils.radToDeg(position.azimuth) + 180,
                      360
                  )

    };

}

export function setAutoTracking(sunSystem, enabled) {
  sunSystem.autoTracking = Boolean(enabled)
}

function createSunPathLine(config) {

    const radius = config.orbitRadius;
    const segments = 100;

    const points = [];

    for (let i = 0; i <= segments; i++) {

        const theta = Math.PI * (i / segments);

        points.push(
            new THREE.Vector3(
                config.centerX + radius * Math.cos(theta),
                config.horizonHeight + radius * Math.sin(theta),
                config.centerZ
            )
        );

    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
        color: 0xffd34d,
        dashSize: 0.35,
        gapSize: 0.15,
        transparent: true,
        opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);

    line.computeLineDistances();

    line.name = "SunPathArc";

    return line;

}

function calculateSunPosition(angles, config) {

    const radius = config.orbitRadius;

    // Map azimuth to the semicircle:
    // 90° (East)  -> left end
    // 180° (South)-> top
    // 270° (West) -> right end

    const t = THREE.MathUtils.clamp(
        (angles.azimuth - 90) / 180,
        0,
        1
    );

    const theta = Math.PI * (1 - t);

    return new THREE.Vector3(
        config.centerX + radius * Math.cos(theta),
        config.horizonHeight + radius * Math.sin(theta),
        config.centerZ
    );

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

export function updateHardwareSun(sunSystem, trackerAngle, isNight) {

    const radius = sunSystem.config.orbitRadius;

    // Map tracker angle (-30 to 30) to the sun path
    const theta = THREE.MathUtils.mapLinear(
        trackerAngle,
        -30,
         30,
        Math.PI,
        0
    );

    const position = new THREE.Vector3(
        sunSystem.config.centerX + radius * Math.cos(theta),
        sunSystem.config.horizonHeight + radius * Math.sin(theta),
        sunSystem.config.centerZ
    );

    sunSystem.sunGroup.position.copy(position);

    if (isNight) {

        sunSystem.sunGroup.visible = false;
        sunSystem.directionalLight.intensity = 0;

    } else {

        sunSystem.sunGroup.visible = true;

        syncDirectionalLight(
            sunSystem,
            position,
            45
        );

    }

}

function lerpAngle(current, target, amount) {
  return current + angleDelta(target, current) * amount
}

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current))
}
