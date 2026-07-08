import './ui.css'

const DEFAULT_SENSOR_DATA = {
  angle: {
    label: "Servo Angle",
    value: 0,
    unit: "deg"
  },

  left: {
    label: "LDR Left",
    value: 0,
    unit: ""
  },

  right: {
    label: "LDR Right",
    value: 0,
    unit: ""
  },

  difference: {
    label: "Balance",
    value: 0,
    unit: ""
  }
}

export function createDashboard({
  parent = document.body,
} = {}){
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
              <p class="status-value" data-connection-state>MQTT Connected</p>
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
          </div>
        </section>

        <section class="dashboard-section" aria-labelledby="sensor-data-title">
          <div class="dashboard-section-header">
            <h2 class="dashboard-section-title" id="sensor-data-title">Live Telemetry</h2>
          </div>
          <div class="dashboard-section-body sensor-grid" data-sensor-grid></div>
        </section>

      </main>

      <footer class="dashboard-footer">
        <div class="dashboard-footer-row">
          <span class="dashboard-footer-label">Pico W</span>
          <span class="dashboard-footer-value" data-esp32-label>Awaiting device</span>
        </div>
        <div class="dashboard-footer-row">
          <span class="dashboard-footer-label">MQTT Broker</span>
          <span class="dashboard-footer-value" data-transport-label>Not connected</span>
        </div>
        <div class="dashboard-footer-row">
            <span class="dashboard-footer-label">
                WebSocket
            </span>

            <span
                class="dashboard-footer-value"
                data-websocket-label>

                Connected

            </span>
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
    sunElevation: dashboard.querySelector('[data-sun-elevation]'),
    sunAzimuth: dashboard.querySelector('[data-sun-azimuth]'),
    trackingStatus: dashboard.querySelector('[data-tracking-status]'),
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


  function updateSunTracking({
    elevation,
    azimuth,
    trackingStatus
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
  }

  function setLastUpdated(date = new Date()) {
    elements.lastUpdated.textContent = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Future MQTT/WebSocket handlers can call these functions when ESP32 data arrives.
  function updateConnectionLabels({ pico, mqtt, websocket } = {}) {

    if (pico) {
        elements.esp32Label.textContent = pico
    }

    if (mqtt) {
        elements.connectionState.textContent = mqtt
        elements.transportLabel.textContent = mqtt
    }

    if (websocket) {
        document.querySelector("[data-websocket-label]").textContent = websocket
    }

}

  updateSensorData({
    angle: 0,
    left: 0,
    right: 0,
    difference: 0
})
  updateStatus({ online: true, connection: 'MQTT Connected' })

  updateSunTracking({
    elevation: 0,
    azimuth: 0,
    trackingStatus: "Waiting..."
});

  return {
      root: dashboard,
      updateSensorData,
      updateStatus,
      setLastUpdated,
      updateSunTracking,
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

