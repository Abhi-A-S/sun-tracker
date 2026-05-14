import './style.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202020)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

camera.position.set(0, 2, 5)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.innerHTML = ''
document.body.appendChild(renderer.domElement)

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.position.set(5, 10, 7)

scene.add(directionalLight)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Loader
const loader = new GLTFLoader()

loader.load(
  '/models/model.glb',

  function (gltf) {
    const model = gltf.scene

    scene.add(model)

    model.position.set(0, 0, 0)
    model.scale.set(1, 1, 1)

    console.log('Model Loaded')
  },

  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
  },

  function (error) {
    console.error('Error loading model:', error)
  }
)

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight

  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  controls.update()

  renderer.render(scene, camera)
}

animate()