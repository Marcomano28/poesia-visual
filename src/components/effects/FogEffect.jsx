import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { useTexture, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

const FogMaterial = shaderMaterial(
  {
    uTime: 0,
    uBlend: 0,
    dispImage: null,
    dispImage2: null,
  },
  // vertex
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment
  `
    uniform float uTime;
    uniform float uBlend;
    uniform sampler2D dispImage;
    uniform sampler2D dispImage2;
    varying vec2 vUv;

    #define PI 3.14159265359

    // Hash
    float hash(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 17.5);
      return fract(p.x * p.y);
    }

    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
      );
    }

    // Fractal noise (3 octaves)
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for(int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = p * 2.1 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    // Floating dust particle
    float particle(vec2 uv, vec2 pos, float size) {
      float d = length(uv - pos);
      return smoothstep(size, size * 0.1, d);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.15;

      // --- Fog layers ---
      vec2 q = vec2(fbm(uv + vec2(0.0, t * 0.3)), fbm(uv + vec2(5.2, t * 0.2)));
      vec2 r = vec2(fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.12),
                    fbm(uv + 4.0 * q + vec2(8.3, 2.8) + t * 0.09));
      float fog = fbm(uv + 4.0 * r);

      // Color de niebla dorada / grisácea
      vec3 fogColor1 = vec3(0.85, 0.75, 0.55); // dorado cálido
      vec3 fogColor2 = vec3(0.15, 0.12, 0.10); // sombra oscura

      // Imagen de fondo
      // Distorsionamos ligeramente la UV con el fog
      vec2 distortedUV = uv + (vec2(r) - 0.5) * 0.04;
      vec4 imgColor = mix(texture2D(dispImage, distortedUV), texture2D(dispImage2, distortedUV), uBlend);

      // Velo de niebla sobre la imagen
      float fogStrength = smoothstep(0.3, 0.85, fog) * 0.65;
      vec3 fogLayer = mix(fogColor2, fogColor1, fog);

      vec3 result = mix(imgColor.rgb, fogLayer, fogStrength);

      // --- Partículas flotantes ---
      float particles = 0.0;
      for(int i = 0; i < 18; i++) {
        float fi = float(i);
        float speed = 0.04 + hash(vec2(fi, fi * 1.7)) * 0.08;
        float size  = 0.002 + hash(vec2(fi * 3.1, fi)) * 0.003;
        vec2 basePos = vec2(
          hash(vec2(fi, 13.0)),
          hash(vec2(fi * 7.3, 5.1))
        );
        // Movimiento sinusoidal lento + drift
        vec2 pos = basePos + vec2(
          sin(t * speed * PI * 2.0 + fi) * 0.06,
          mod(t * speed - basePos.y, 1.0) - 0.5
        );
        pos = fract(pos);
        particles += particle(uv, pos, size) * (0.4 + hash(vec2(fi, t)) * 0.3);
      }

      // Color de partículas: blanco-dorado
      vec3 particleColor = vec3(1.0, 0.92, 0.72);
      result = mix(result, particleColor, clamp(particles, 0.0, 1.0) * 0.85);

      // Viñeta oscura en los bordes
      float vignette = 1.0 - smoothstep(0.3, 0.9, length(uv - 0.5) * 1.5);
      result *= vignette * 0.7 + 0.3;

      gl_FragColor = vec4(result, 1.0);
    }
  `
)

extend({ FogMaterial })

export default function FogEffect({ images }) {
  const [imgIndex, setImgIndex] = useState(0)
  const materialRef = useRef()
  const { viewport } = useThree()
  const textures = useTexture(images)
  const blendRef = useRef(0)
  const transitioning = useRef(false)
  
  useEffect(() => {
    const id = setInterval(() => {
    const next = (imgIndex + 1) % images.length
    materialRef.current.uniforms.dispImage2.value = textures[next]
    transitioning.current = true
    setImgIndex(next)
  }, 10000)
    return () => clearInterval(id)
  }, [imgIndex, images.length])

useFrame(({ clock }) => {
  if (materialRef.current) {
    materialRef.current.uTime = clock.elapsedTime

    if (transitioning.current) {
      blendRef.current = THREE.MathUtils.lerp(blendRef.current, 1.0, 0.06)
      materialRef.current.uniforms.uBlend.value = blendRef.current

      if (blendRef.current > 0.99) {
        blendRef.current = 0
        transitioning.current = false
        materialRef.current.uniforms.dispImage.value =
        materialRef.current.uniforms.dispImage2.value
        materialRef.current.uniforms.uBlend.value = 0
      }
    }
  }
}) 

  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <fogMaterial ref={materialRef} dispImage={textures[0]} dispImage2={textures[0]}  />
    </mesh>
  )
}
