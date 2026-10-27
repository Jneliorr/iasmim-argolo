import { useEffect, useRef } from 'react';

export function Atmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const gl = element.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    };
    const clean = () => { cancelAnimationFrame(frame); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); };
    try {
      const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}');
      const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;
        uniform vec2 resolution; uniform float time;
        void main(){
          vec2 p=gl_FragCoord.xy/resolution;
          float a=sin(p.x*4.0+p.y*2.3+time*.15)*.12;
          float cloud=exp(-length((p-vec2(.62+sin(time*.08)*.13,.58+a))*vec2(1.3,2.0))*3.0);
          vec3 cream=vec3(.965,.953,.925); vec3 sage=vec3(.76,.79,.65); vec3 blush=vec3(.89,.78,.75);
          vec3 col=mix(cream,sage,cloud*.38);
          col=mix(col,blush,(1.0-smoothstep(.0,.7,length(p-vec2(.12,.2+cos(time*.1)*.12))))*.28);
          float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
          gl_FragColor=vec4(col+(grain-.5)*.009,1.);
        }`);
      program = gl.createProgram(); if (!program) throw new Error('Program unavailable');
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed');
      gl.useProgram(program); buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const resolution = gl.getUniformLocation(program,'resolution'), time = gl.getUniformLocation(program,'time');
      const start = performance.now();
      const draw = () => {
        if (document.hidden || gl.isContextLost()) return;
        const ratio = Math.min(window.devicePixelRatio, 1.5);
        const width = Math.round(element.clientWidth*ratio), height = Math.round(element.clientHeight*ratio);
        if (element.width !== width || element.height !== height) { element.width=width; element.height=height; gl.viewport(0,0,width,height); }
        gl.uniform2f(resolution,width,height); gl.uniform1f(time,motion.matches?0:(performance.now()-start)/1000); gl.drawArrays(gl.TRIANGLES,0,6);
        if (!motion.matches) frame=requestAnimationFrame(draw);
      };
      const resume = () => { cancelAnimationFrame(frame); draw(); };
      document.addEventListener('visibilitychange',resume); window.addEventListener('resize',resume); motion.addEventListener('change',resume); draw();
      return () => { document.removeEventListener('visibilitychange',resume); window.removeEventListener('resize',resume); motion.removeEventListener('change',resume); clean(); };
    } catch { clean(); }
  }, []);
  return <canvas ref={canvas} className="atmosphere" aria-hidden="true" />;
}
