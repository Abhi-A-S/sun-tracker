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

camera.position.set(3, 3, 6)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.setSize(window.innerWidth, window.innerHeight)

document.body.innerHTML = ''
document.body.appendChild(renderer.domElement)

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

scene.add(dirLight) 

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

const gridHelper = new THREE.GridHelper(25, 25)

scene.add(gridHelper)

// Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0)
controls.update()

// Loader
const loader = new GLTFLoader()

loader.load(

  '/models/model.glb',

  // Success
  (gltf) => {

    const model = gltf.scene

    scene.add(model)

    // Scale first
    model.scale.setScalar(5)

    // Bounding box
    const box = new THREE.Box3().setFromObject(model)

    const center = box.getCenter(new THREE.Vector3())

    // Center model
    model.position.x -= center.x
    model.position.z -= center.z

    // Put on ground
    model.position.y -= box.min.y

    // Shadows
    model.traverse((child) => {

      if (child.isMesh) {

        child.castShadow = true
        child.receiveShadow = true

        child.material.side = THREE.DoubleSide

        child.material.flatShading = false
        child.material.needsUpdate = true

      }

    })

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

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  controls.update()

  renderer.render(scene, camera)
}

animate()