import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const PARTICLE_COUNT = 150000

// Generado una sola vez al importar el módulo
const _pos  = new Float32Array(PARTICLE_COUNT * 3)
const _rest = new Float32Array(PARTICLE_COUNT * 2)
const _size = new Float32Array(PARTICLE_COUNT)
const _phase= new Float32Array(PARTICLE_COUNT)
const _mass = new Float32Array(PARTICLE_COUNT) // "peso" de cada partícula

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const u = Math.random(), v = Math.random()
  _rest[i*2] = u;  _rest[i*2+1] = v
  _pos[i*3]  = u*2-1; _pos[i*3+1] = v*2-1; _pos[i*3+2] = 0
  _mass[i]   = 0.2 + Math.random() * Math.random() * 0.3  // distribución sesgada: más partículas pesadas
  _size[i]   = 0.2 + _mass[i] * 8.2                       // tamaño proporcional a masa
  _phase[i]  = Math.random() * Math.PI * 2
}

const vertexShader = `
attribute vec2 aRest;
attribute vec2 aOffset;
attribute float aSize;
attribute float aMass;

uniform vec2 uMouse;
uniform float uBlow;
uniform vec2 uAspect;

varying float vAlpha;
varying vec2 vUV;

void main() {

  vec2 pos = aRest + aOffset;

  vec2 diff = pos - uMouse;
  vec2 diffAsp = diff * uAspect;
  float dist = length(diffAsp) + 0.0001;

  float force = uBlow * (1.0 - aMass) / (dist * dist + 0.002);
  force = clamp(force, 0.0, 0.75);

  vec2 dir = normalize(diff);

  pos += dir * force;

  vAlpha = 1.0;
  vUV = aRest;

  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = aSize * (1.0 + force * 4.0);
  }
`

const fragmentShader = `
precision mediump float;
uniform sampler2D uImage;
uniform sampler2D uImageNext;
uniform float uBlend;

varying vec2 vUV;
varying float vAlpha;

void main() {
  float r = length(gl_PointCoord - 0.51);
  if (r > 0.5) discard;

  vec4 img = mix(texture2D(uImage, vUV), texture2D(uImageNext, vUV), uBlend);

  gl_FragColor = vec4(img.rgb, vAlpha);
}
`

export default function SandEffect({ images }) {
  const [imgIndex, setImgIndex] = useState(0)
  const textures = useTexture(images)
  const { size, gl, viewport } = useThree()
  const pointsRef = useRef()
  const mouseRef = useRef(new THREE.Vector2(-1, -1))
  const blendRef = useRef(0)
  const transitioning = useRef(false)

  const prevMouse = useRef(new THREE.Vector2(-1, -1))
  const velocity = useRef(0)

  const uniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uMouse:  { value: new THREE.Vector2(-1, -1) },
    uBlow:   { value: 0.001 },
    uAspect: { value: new THREE.Vector2(1, 1) },
    uImage:  { value: textures[0] },
    uBlend:     { value: 0 },
    uImageNext: { value: textures[0] }, 
  }), [])

  useEffect(() => {
    const canvas = gl.domElement

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      mouseRef.current.set(
        (e.clientX - r.left) / r.width,
        1.0 - (e.clientY - r.top) / r.height
      )
    }

    const onLeave = () => mouseRef.current.set(-1, -1)

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [gl])

  useEffect(() => {
   const id = setInterval(() => {
    const next = (imgIndex + 1) % images.length
    pointsRef.current.material.uniforms.uImageNext.value = textures[next]
    transitioning.current = true
    setImgIndex(next)
    }, 10000)
  return () => clearInterval(id)
  }, [imgIndex, images.length])

  useFrame(({ clock }) => {
   if (!pointsRef.current) return
       const delta = mouseRef.current.distanceTo(prevMouse.current)
       velocity.current = THREE.MathUtils.lerp(velocity.current, delta * 8, 0.02)
       prevMouse.current.copy(mouseRef.current)
       const u = pointsRef.current.material.uniforms
       u.uMouse.value.copy(mouseRef.current)
       u.uBlow.value = velocity.current

     if (transitioning.current) {
          blendRef.current = THREE.MathUtils.lerp(blendRef.current, 1.0, 0.06)
          pointsRef.current.material.uniforms.uBlend.value = blendRef.current
    
          if (blendRef.current > 0.99) {
            blendRef.current = 0
            transitioning.current = false
            pointsRef.current.material.uniforms.uImage.value =
            pointsRef.current.material.uniforms.uImageNext.value
            pointsRef.current.material.uniforms.uBlend.value = 0
          }
        }   
  })

  return (
    <>
      {/* 🔥 Plano que ahora cubre TODO el viewport */}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={textures[imgIndex]} />
      </mesh>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position"
            array={_pos} count={PARTICLE_COUNT} itemSize={3} />
          <bufferAttribute attach="attributes-aRest"
            array={_rest} count={PARTICLE_COUNT} itemSize={2} />
          <bufferAttribute attach="attributes-aSize"
            array={_size} count={PARTICLE_COUNT} itemSize={1} />
          <bufferAttribute attach="attributes-aPhase"
            array={_phase} count={PARTICLE_COUNT} itemSize={1} />
          <bufferAttribute attach="attributes-aMass"
            array={_mass} count={PARTICLE_COUNT} itemSize={1} />
        </bufferGeometry>

        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </>
  )
}