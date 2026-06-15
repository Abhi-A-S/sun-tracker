import './ui.css'

const DEFAULT_SENSOR_DATA = {
  angle: { label: 'Solar Panel Angle', value: 32, unit: 'deg' },
  sunIntensity: { label: 'Sun Intensity (LDR)', value: 82, unit: '%' }
}

export function createDashboard({
  parent = document.body,
  onTiltChange,
  onStart,
  onStop,
  onReset,
  onAutoTrackingChange,
  onTimeSpeedChange,
  onManualSunPositionChange
} = {}) {
  const dashboard = document.createElement('aside')
  dashboard.className = 'dashboard-shell'
  dashboard.innerHTML = `
    <div class="dashboard-panel" data-dashboard-panel>
      <header class="dashboard-header">
        <div>
          <div class="dashboard-kicker">Digital Twin</div>
          <h1 class="dashboard-title">Solar Tracker Digital Twin</h1>
        </div>
        <button class="dashboard-collapse" type="button" data-collapse aria-label="Collapse dashboard">
          <span data-collapse-icon>-</span>
        </button>
      </header>

      <main class="dashboard-content">
        <section class="dashboard-section" aria-labelledby="system-status-title">
          <div class="dashboard-section-header">
            <h2 class="dashboard-section-title" id="system-status-title">System Status</h2>
            <div class="status-pill" data-status-pill>
              <span class="status-dot"></span>
              <span data-status-text>Online</span>
            </div>
          </div>
          <div class="dashboard-section-body status-grid">
            <div class="status-item">
              <p class="status-label">Connection</p>
              <p class="status-value" data-connection-state>Simulated link</p>
            </div>
            <div class="status-item">
              <p class="status-label">Last Updated</p>
              <p class="status-value" data-last-updated>--:--:--</p>
            </div>
          </div>
        </section>

        <section class="dashboard-section" aria-labelledby="sun-tracking-title">
          <div class="dashboard-section-header">
            <h2 class="dashboard-section-title" id="sun-tracking-title">Sun Tracking</h2>
          </div>
          <div class="dashboard-section-body sun-tracking-stack">
            <div class="tracking-grid">
              <div class="status-item">
                <p class="status-label">Sun Elevation</p>
                <p class="status-value" data-sun-elevation>-- deg</p>
              </div>
              <div class="status-item">
                <p class="status-label">Sun Azimuth</p>
                <p class="status-value" data-sun-azimuth>-- deg</p>
              </div>
              <div class="status-item">
                <p class="status-label">Tracking Status</p>
                <p class="status-value" data-tracking-status>Auto tracking</p>
              </div>
            </div>

            <div class="sun-control-stack">
              <button class="control-button is-primary is-active" type="button" data-auto-tracking>
                Auto Tracking ON
              </button>

              <div>
                <div class="tilt-row">
                  <label class="status-label" for="time-speed">Time Speed</label>
                  <span class="tilt-value" data-time-speed-value>1.0x</span>
                </div>
                <input
                  class="tilt-slider"
                  id="time-speed"
                  data-time-speed-slider
                  type="range"
                  min="0"
                  max="8"
                  step="0.1"
                  value="1"
                />
              </div>

              <div>
                <label class="status-label" for="manual-sun-position">Manual Sun Position</label>
                <input
                  class="tilt-slider"
                  id="manual-sun-position"
                  data-manual-sun-slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value="0.62"
                />
              </div>
            </div>
          </div>
        </section>

        <section class="dashboard-section" aria-labelledby="sensor-data-title">
          <div class="dashboard-section-header">
            <h2 class="dashboard-section-title" id="sensor-data-title">Sensor Data</h2>
          </div>
          <div class="dashboard-section-body sensor-grid" data-sensor-grid></div>
        </section>

        <section class="dashboard-section" aria-labelledby="controls-title">
          <div class="dashboard-section-header">
            <h2 class="dashboard-section-title" id="controls-title">Controls</h2>
            <span class="tilt-value" data-tilt-value>32 deg</span>
          </div>
          <div class="dashboard-section-body control-stack">
            <div>
              <div class="tilt-row">
                <label class="status-label" for="tilt-angle">Panel Tilt Angle</label>
              </div>
              <input
                class="tilt-slider"
                id="tilt-angle"
                data-tilt-slider
                type="range"
                min="-65"
                max="65"
                step="1"
                value="32"
              />
            </div>
            <div class="control-actions">
              <button class="control-button is-primary" type="button" data-start>Start</button>
              <button class="control-button is-danger" type="button" data-stop>Stop</button>
              <button class="control-button" type="button" data-reset>Reset</button>
            </div>
          </div>
        </section>

      </main>

      <footer class="dashboard-footer">
        <div class="dashboard-footer-row">
          <span class="dashboard-footer-label">ESP32</span>
          <span class="dashboard-footer-value" data-esp32-label>Awaiting device</span>
        </div>
        <div class="dashboard-footer-row">
          <span class="dashboard-footer-label">MQTT/WebSocket</span>
          <span class="dashboard-footer-value" data-transport-label>Not connected</span>
        </div>
      </footer>
    </div>
  `

  parent.appendChild(dashboard)

  const elements = {
    panel: dashboard.querySelector('[data-dashboard-panel]'),
    collapseButton: dashboard.querySelector('[data-collapse]'),
    collapseIcon: dashboard.querySelector('[data-collapse-icon]'),
    statusPill: dashboard.querySelector('[data-status-pill]'),
    statusText: dashboard.querySelector('[data-status-text]'),
    connectionState: dashboard.querySelector('[data-connection-state]'),
    lastUpdated: dashboard.querySelector('[data-last-updated]'),
    sensorGrid: dashboard.querySelector('[data-sensor-grid]'),
    tiltSlider: dashboard.querySelector('[data-tilt-slider]'),
    tiltValue: dashboard.querySelector('[data-tilt-value]'),
    startButton: dashboard.querySelector('[data-start]'),
    stopButton: dashboard.querySelector('[data-stop]'),
    resetButton: dashboard.querySelector('[data-reset]'),
    sunElevation: dashboard.querySelector('[data-sun-elevation]'),
    sunAzimuth: dashboard.querySelector('[data-sun-azimuth]'),
    trackingStatus: dashboard.querySelector('[data-tracking-status]'),
    autoTrackingButton: dashboard.querySelector('[data-auto-tracking]'),
    timeSpeedSlider: dashboard.querySelector('[data-time-speed-slider]'),
    timeSpeedValue: dashboard.querySelector('[data-time-speed-value]'),
    manualSunSlider: dashboard.querySelector('[data-manual-sun-slider]'),
    esp32Label: dashboard.querySelector('[data-esp32-label]'),
    transportLabel: dashboard.querySelector('[data-transport-label]')
  }

  const sensorElements = createSensorCards(elements.sensorGrid, DEFAULT_SENSOR_DATA)
  let autoTrackingEnabled = true
  elements.collapseButton.addEventListener('click', () => {
    const isCollapsed = elements.panel.classList.toggle('is-collapsed')
    elements.collapseButton.setAttribute(
      'aria-label',
      isCollapsed ? 'Expand dashboard' : 'Collapse dashboard'
    )
    elements.collapseIcon.textContent = isCollapsed ? '+' : '-'
  })

  elements.tiltSlider.addEventListener('input', (event) => {
    const angle = Number(event.target.value)
    setTiltAngle(angle)
    onTiltChange?.(angle)
  })

  elements.startButton.addEventListener('click', () => {
    updateStatus({ online: true, connection: 'Simulation running' })
    onStart?.()
  })

  elements.stopButton.addEventListener('click', () => {
    updateStatus({ online: false, connection: 'Simulation stopped' })
    onStop?.()
  })

  elements.resetButton.addEventListener('click', () => {
    setTiltAngle(0)
    updateSensorData({
      angle: 0,
      sunIntensity: DEFAULT_SENSOR_DATA.sunIntensity.value
    })
    onReset?.()
  })

  elements.autoTrackingButton.addEventListener('click', () => {
    setAutoTracking(!autoTrackingEnabled)
    onAutoTrackingChange?.(autoTrackingEnabled)
  })

  elements.timeSpeedSlider.addEventListener('input', (event) => {
    const multiplier = Number(event.target.value)

    setTimeSpeed(multiplier)
    onTimeSpeedChange?.(multiplier)
  })

  elements.manualSunSlider.addEventListener('input', (event) => {
    const dayProgress = Number(event.target.value)

    setManualSunPosition(dayProgress)
    onManualSunPositionChange?.(dayProgress)
  })

  function updateSensorData(values = {}) {
    Object.entries(values).forEach(([key, value]) => {
      const sensor = sensorElements[key]

      if (!sensor) {
        return
      }

      sensor.value.textContent = formatSensorValue(value)
    })

    setLastUpdated()
  }

  function updateStatus({ online, connection } = {}) {
    if (typeof online === 'boolean') {
      elements.statusPill.classList.toggle('is-offline', !online)
      elements.statusText.textContent = online ? 'Online' : 'Offline'
    }

    if (connection) {
      elements.connectionState.textContent = connection
    }

    setLastUpdated()
  }

  function setTiltAngle(angle) {
    const safeAngle = clamp(Math.round(Number(angle) || 0), -65, 65)

    elements.tiltSlider.value = String(safeAngle)
    elements.tiltValue.textContent = `${safeAngle} deg`
    updateSensorData({ angle: safeAngle })
  }

  function updateSunTracking({
    elevation,
    azimuth,
    trackingStatus,
    dayProgress
  } = {}) {
    if (typeof elevation === 'number') {
      elements.sunElevation.textContent = `${formatSensorValue(elevation)} deg`
    }

    if (typeof azimuth === 'number') {
      elements.sunAzimuth.textContent = `${formatSensorValue(azimuth)} deg`
    }

    if (trackingStatus) {
      elements.trackingStatus.textContent = trackingStatus
    }

    if (typeof dayProgress === 'number') {
      setManualSunPosition(dayProgress)
    }
  }

  function setAutoTracking(enabled) {
    autoTrackingEnabled = Boolean(enabled)
    elements.autoTrackingButton.classList.toggle('is-active', autoTrackingEnabled)
    elements.autoTrackingButton.textContent = autoTrackingEnabled
      ? 'Auto Tracking ON'
      : 'Auto Tracking OFF'
    elements.trackingStatus.textContent = autoTrackingEnabled ? 'Auto tracking' : 'Manual control'
  }

  function setTimeSpeed(multiplier) {
    const safeMultiplier = clamp(Number(multiplier) || 0, 0, 8)

    elements.timeSpeedSlider.value = String(safeMultiplier)
    elements.timeSpeedValue.textContent = `${safeMultiplier.toFixed(1)}x`
  }

  function setManualSunPosition(dayProgress) {
    const safeProgress = clamp(Number(dayProgress) || 0, 0, 1)

    elements.manualSunSlider.value = String(safeProgress)
  }

  function setLastUpdated(date = new Date()) {
    elements.lastUpdated.textContent = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Future MQTT/WebSocket handlers can call these functions when ESP32 data arrives.
  function updateConnectionLabels({ esp32, transport } = {}) {
    if (esp32) {
      elements.esp32Label.textContent = esp32
    }

    if (transport) {
      elements.transportLabel.textContent = transport
    }
  }

  updateSensorData({
    angle: DEFAULT_SENSOR_DATA.angle.value,
    sunIntensity: DEFAULT_SENSOR_DATA.sunIntensity.value
  })
  updateStatus({ online: true, connection: 'Simulated link' })

  updateSunTracking({
    elevation: 72.5,
    azimuth: 201.6,
    trackingStatus: 'Auto tracking',
    dayProgress: 0.62
  })

  return {
    root: dashboard,
    updateSensorData,
    updateStatus,
    setTiltAngle,
    setLastUpdated,
    updateSunTracking,
    setAutoTracking,
    setTimeSpeed,
    setManualSunPosition,
    updateConnectionLabels
  }
}

function createSensorCards(parent, sensors) {
  const sensorElements = {}

  Object.entries(sensors).forEach(([key, sensor]) => {
    const card = document.createElement('article')
    card.className = 'sensor-card'
    card.innerHTML = `
      <div class="sensor-label">${sensor.label}</div>
      <div class="sensor-value-row">
        <span class="sensor-value" data-sensor-value>${formatSensorValue(sensor.value)}</span>
        <span class="sensor-unit">${sensor.unit}</span>
      </div>
    `

    parent.appendChild(card)
    sensorElements[key] = {
      card,
      value: card.querySelector('[data-sensor-value]')
    }
  })

  return sensorElements
}

function formatSensorValue(value) {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return Number(value).toFixed(1)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

