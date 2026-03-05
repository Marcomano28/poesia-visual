import { useEffect, useRef } from 'react'
import { trailVS, trailFS, rainVS, rainFS } from './rainShaders.js'
import MirrorHint from '../MirrorHint.jsx'

// ── GL helpers ────────────────────────────────────────────────────────────────

function compileShader(gl, src, type) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(s))
    return null
  }
  return s
}

function buildProgram(gl, vsSrc, fsSrc) {
  const prog = gl.createProgram()
  gl.attachShader(prog, compileShader(gl, vsSrc, gl.VERTEX_SHADER))
  gl.attachShader(prog, compileShader(gl, fsSrc, gl.FRAGMENT_SHADER))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Link error:', gl.getProgramInfoLog(prog))
    return null
  }
  return prog
}

function createFBO(gl, w, h) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE)
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { fbo, tex }
}

function loadTex(gl, url) {
  return new Promise((res, rej) => {
    const texture = gl.createTexture()
    const img     = new Image()
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      res(texture)
    }
    img.onerror = rej
    img.src     = url
  })
}

// ── Minimal mat4 (sin dependencias externas) ──────────────────────────────────
// function mat4Id() {
//   return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
// }
// function mat4Persp(fovy, aspect, near, far) {
//   const f  = 1.0 / Math.tan(fovy / 2)
//   const nf = 1   / (near - far)
//   const m  = new Float32Array(16)
//   m[0]=f/aspect; m[5]=f; m[10]=(far+near)*nf; m[11]=-1; m[14]=2*far*near*nf
//   return m
// }
function mat4Id() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
}
function mat4Ortho() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,-1,0, 0,0,0,1])
}

function mat4Trans(m, tx, ty, tz) {
  const o = new Float32Array(m)
  o[12] = m[0]*tx + m[4]*ty + m[8]*tz  + m[12]
  o[13] = m[1]*tx + m[5]*ty + m[9]*tz  + m[13]
  o[14] = m[2]*tx + m[6]*ty + m[10]*tz + m[14]
  o[15] = m[3]*tx + m[7]*ty + m[11]*tz + m[15]
  return o
}
function mat4Scale(m, sx, sy, sz) {
  const o = new Float32Array(m)
  o[0]*=sx; o[1]*=sx; o[2]*=sx;  o[3]*=sx
  o[4]*=sy; o[5]*=sy; o[6]*=sy;  o[7]*=sy
  o[8]*=sz; o[9]*=sz; o[10]*=sz; o[11]*=sz
  return o
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RainyEffect({ images }) {
  const canvasRef = useRef(null)
  let currentIdx = 0
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = canvas.clientWidth
    canvas.height = canvas.clientHeight

    const gl = canvas.getContext('webgl2')
    if (!gl) { console.error('WebGL2 not available'); return }

    const trailProg = buildProgram(gl, trailVS, trailFS)
    const rainProg  = buildProgram(gl, rainVS,  rainFS)
    
    // Trail quad VAO
    const quadVAO = gl.createVertexArray()
    gl.bindVertexArray(quadVAO)
    const quadBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(trailProg, 'aPos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // FBOs
    let fboA = createFBO(gl, canvas.width, canvas.height)
    let fboB = createFBO(gl, canvas.width, canvas.height)
    for (const f of [fboA, fboB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo)
      gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // Rain mesh VAO
    const W = 40, H = 40
    const verts = [], uvs = [], idxs = []
    for (let y = 0; y <= H; y++) {
      for (let x = 0; x <= W; x++) {
        verts.push((x/W)*2-1, (y/H)*2-1, 0, 1)
        uvs.push(x/W, y/H)
        if (x < W && y < H) {
          const a=x+y*(W+1), b=x+(y+1)*(W+1), c=(x+1)+(y+1)*(W+1), d=(x+1)+y*(W+1)
          idxs.push(a,b,d, b,c,d)
        }
      }
    }

    const rainVAO = gl.createVertexArray()
    gl.bindVertexArray(rainVAO)
    gl.useProgram(rainProg)

    const vb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)
    const vl = gl.getAttribLocation(rainProg, 'aVertexPosition')
    gl.enableVertexAttribArray(vl); gl.vertexAttribPointer(vl, 4, gl.FLOAT, false, 0, 0)

    const tb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, tb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW)
    const tl = gl.getAttribLocation(rainProg, 'aTextureCoord')
    gl.enableVertexAttribArray(tl); gl.vertexAttribPointer(tl, 2, gl.FLOAT, false, 0, 0)

    const ib = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idxs), gl.STATIC_DRAW)
    gl.bindVertexArray(null)

    // Matrices
    const fovy = 35 * Math.PI / 180
    // let projMat = mat4Persp(fovy, canvas.clientWidth / canvas.clientHeight, 0.1, 10.0)
    // const mvMat  = mat4Trans(mat4Id(), 0, 0, -2)
    let projMat = mat4Ortho()
    const mvMat = mat4Id()
    const imgMat = mat4Scale(mat4Id(), 1.0, 1.1, 1.0)

    gl.useProgram(rainProg)
    gl.uniformMatrix4fv(gl.getUniformLocation(rainProg, 'dispImageMatrix'), false, imgMat)
    gl.uniformMatrix4fv(gl.getUniformLocation(rainProg, 'uMVMatrix'),       false, mvMat)
    gl.uniformMatrix4fv(gl.getUniformLocation(rainProg, 'uPMatrix'),        false, projMat)
    gl.uniform2f(gl.getUniformLocation(rainProg, 'uReso'), canvas.width, canvas.height)

    // Load texture
    let dispTex = null
    
    loadTex(gl, images[0]).then(t => { dispTex = t })
    const intervalId = setInterval(() => {
    currentIdx = (currentIdx + 1) % images.length
    loadTex(gl, images[currentIdx]).then(t => { dispTex = t })
    }, 12000)

    // Mouse / touch
    let mouse  = { x: -1, y: -1 }
    let active = false

    const onMove = (cx, cy) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = (cx - r.left) / canvas.width
      mouse.y = (cy - r.top)  / canvas.height
      active  = true
    }
    const onMouse = (e) => onMove(e.clientX, e.clientY)
    const onTouch = (e) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }
    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('touchmove', onTouch, { passive: false })

    // Resize
    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      canvas.width = w; canvas.height = h
      fboA = createFBO(gl, w, h); fboB = createFBO(gl, w, h)
      for (const f of [fboA, fboB]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo)
        gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, w, h)
      // projMat = mat4Persp(fovy, w/h, 0.1, 10.0)
      projMat = mat4Ortho()
      gl.useProgram(rainProg)
      gl.uniformMatrix4fv(gl.getUniformLocation(rainProg, 'uPMatrix'), false, projMat)
      gl.uniform2f(gl.getUniformLocation(rainProg, 'uReso'), w, h)
    }
    const onOrientationChange = () => {
         setTimeout(() => onResize(), 300) // pequeño delay para que el navegador termine de rotar
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrientationChange)

    // Render loop
    let rafId
    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const t = performance.now() / 1000.0

      // Pass 1 – trail
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.fbo)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(trailProg)
      gl.bindVertexArray(quadVAO)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fboA.tex)
      gl.uniform1i(gl.getUniformLocation(trailProg, 'uPrevTrail'), 0)
      gl.uniform2f(gl.getUniformLocation(trailProg, 'uMouse'), mouse.x, 1.0 - mouse.y)
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uBrushRadius'), 0.08)
      gl.uniform1f(gl.getUniformLocation(trailProg, 'uFade'), active ? 1.0 : 0.992)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindVertexArray(null)

      ;[fboA, fboB] = [fboB, fboA]
      active = false

      // Pass 2 – rain
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0.08, 0.08, 0.08, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.useProgram(rainProg)
      gl.bindVertexArray(rainVAO)

      if (dispTex) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, dispTex)
        gl.uniform1i(gl.getUniformLocation(rainProg, 'dispImage'), 0)
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, fboA.tex)
      gl.uniform1i(gl.getUniformLocation(rainProg, 'trailImage'), 1)

      gl.uniform1f(gl.getUniformLocation(rainProg, 'uTime'), t)
      gl.uniform2f(gl.getUniformLocation(rainProg, 'uMouse'), mouse.x*2-1, mouse.y*2-1)

      gl.enable(gl.DEPTH_TEST)
      gl.drawElements(gl.TRIANGLES, idxs.length, gl.UNSIGNED_SHORT, 0)
      gl.bindVertexArray(null)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(intervalId) 
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchmove', onTouch)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientationChange)
    }
  }, [images])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    <MirrorHint />
    </div>
  )
}
