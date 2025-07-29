import { Renderer, Program, Mesh, Triangle, Vec3 } from "ogl";
import type { AudioVisualizer, AudioData } from '../types';

export class ThreadsWebGLVisualizer implements AudioVisualizer {
  id = 'threads-webgl';
  name = 'Threads';
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private container: HTMLDivElement | null = null;
  private time = 0;
  private currentColor = [1, 1, 1] as [number, number, number];
  private targetColor = [1, 1, 1] as [number, number, number];
  private currentAmplitude = 0.5;
  private targetAmplitude = 0.5;

  private vert = /* glsl */ `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  private frag = /* glsl */ `
    precision highp float;

    uniform float iTime;
    uniform vec3 iResolution;
    uniform vec3 uColor;
    uniform float uAmplitude;
    uniform float uDistance;
    uniform vec2 uMouse;

    #define PI 3.1415926538

    const int u_line_count = 40;
    const float u_line_width = 7.0;
    const float u_line_blur = 10.0;

    float Perlin2D(vec2 P) {
        vec2 Pi = floor(P);
        vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
        vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
        Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
        Pt += vec2(26.0, 161.0).xyxy;
        Pt *= Pt;
        Pt = Pt.xzxz * Pt.yyww;
        vec4 hash_x = fract(Pt * (1.0 / 951.135664));
        vec4 hash_y = fract(Pt * (1.0 / 642.949883));
        vec4 grad_x = hash_x - 0.49999;
        vec4 grad_y = hash_y - 0.49999;
        vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
            * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
        grad_results *= 1.4142135623730950;
        vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
                   * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
        vec4 blend2 = vec4(blend, vec2(1.0 - blend));
        return dot(grad_results, blend2.zxzx * blend2.wwyy);
    }

    float pixel(float count, vec2 resolution) {
        return (1.0 / max(resolution.x, resolution.y)) * count;
    }

    float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
        float split_offset = (perc * 0.4);
        float split_point = 0.1 + split_offset;

        float amplitude_normal = smoothstep(split_point, 0.7, st.x);
        float amplitude_strength = 0.5;
        float finalAmplitude = amplitude_normal * amplitude_strength
                               * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

        float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
        float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

        float xnoise = mix(
            Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
            Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
            st.x * 0.3
        );

        float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

        float line_start = smoothstep(
            y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
            y,
            st.y
        );

        float line_end = smoothstep(
            y,
            y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
            st.y
        );

        return clamp(
            (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
            0.0,
            1.0
        );
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord / iResolution.xy;

        float line_strength = 1.0;
        for (int i = 0; i < u_line_count; i++) {
            float p = float(i) / float(u_line_count);
            line_strength *= (1.0 - lineFn(
                uv,
                u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
                p,
                (PI * 1.0) * p,
                uMouse,
                iTime,
                uAmplitude,
                uDistance
            ));
        }

        float colorVal = 1.0 - line_strength;
        fragColor = vec4(uColor * colorVal, colorVal);
    }

    void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    if (!this.renderer) {
      this.initializeWebGL(canvas);
      // Skip first frame to ensure proper initialization
      return;
    }
    
    // Make sure container is visible
    if (this.container) {
      this.container.style.display = 'block';
    }

    // Update time
    this.time += 0.016;

    // Determine speaker and set color
    const speaker = this.getActiveSpeaker(audioData);
    switch(speaker) {
      case 'user':
        this.targetColor = [1.0, 0.0, 0.435]; // Pink
        break;
      case 'ai':
        this.targetColor = [0.0, 0.749, 1.0]; // Cyan
        break;
      case 'both':
        this.targetColor = [0.502, 0.0, 1.0]; // Purple
        break;
      default:
        this.targetColor = [0.4, 0.4, 0.7]; // Default blue-purple
    }

    // Audio response - control amplitude
    const combinedVolume = Math.max(audioData.userVolume, audioData.aiVolume);
    
    // Map volume to amplitude (0.2 to 2.0 range for dynamic effect)
    this.targetAmplitude = 0.2 + (combinedVolume * 1.8);

    // Get frequency data for more dynamic response
    const frequencies = this.combineFrequencies(
      audioData.userFrequencies,
      audioData.aiFrequencies,
      audioData.userVolume,
      audioData.aiVolume
    );
    
    // Use low frequencies for additional amplitude modulation
    const bassLevel = this.getFrequencyBand(frequencies, 0, 10) / 255;
    this.targetAmplitude += bassLevel * 0.5;

    // Smooth transitions
    this.currentColor[0] += (this.targetColor[0] - this.currentColor[0]) * 0.1;
    this.currentColor[1] += (this.targetColor[1] - this.currentColor[1]) * 0.1;
    this.currentColor[2] += (this.targetColor[2] - this.currentColor[2]) * 0.1;
    this.currentAmplitude += (this.targetAmplitude - this.currentAmplitude) * 0.15;

    // Update uniforms
    if (this.program) {
      this.program.uniforms.iTime.value = this.time;
      this.program.uniforms.uColor.value = new Vec3(...this.currentColor);
      this.program.uniforms.uAmplitude.value = this.currentAmplitude;
      // Use mid frequencies for distance effect
      const midLevel = this.getFrequencyBand(frequencies, 10, 30) / 255;
      this.program.uniforms.uDistance.value = midLevel * 0.3;
      // Simulate audio-driven mouse movement for additional dynamics
      const highLevel = this.getFrequencyBand(frequencies, 30, 60) / 255;
      this.program.uniforms.uMouse.value[0] = 0.5 + (highLevel * 0.2 - 0.1);
      this.program.uniforms.uMouse.value[1] = 0.5 + (bassLevel * 0.2 - 0.1);
    }

    // Render
    if (this.renderer && this.mesh) {
      this.renderer.render({ scene: this.mesh });
    }
  }

  private initializeWebGL(canvas: HTMLCanvasElement) {
    try {
      // Create container
      this.container = document.createElement('div');
      this.container.style.position = 'absolute';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.pointerEvents = 'none';
      this.container.style.zIndex = '5';

      // Add to canvas parent
      if (canvas.parentElement) {
        canvas.parentElement.appendChild(this.container);
      }

      // Create renderer
      this.renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        width: canvas.width,
        height: canvas.height,
        dpr: window.devicePixelRatio || 1
      });

      const gl = this.renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Style canvas
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';

      // Add to container
      this.container.appendChild(gl.canvas);

      // Create geometry and program
      const geometry = new Triangle(gl);
      this.program = new Program(gl, {
        vertex: this.vert,
        fragment: this.frag,
        uniforms: {
          iTime: { value: 0 },
          iResolution: {
            value: new Vec3(canvas.width, canvas.height, canvas.width / canvas.height)
          },
          uColor: { value: new Vec3(1, 1, 1) },
          uAmplitude: { value: 0.5 },
          uDistance: { value: 0 },
          uMouse: { value: new Float32Array([0.5, 0.5]) }
        }
      });

      this.mesh = new Mesh(gl, { geometry, program: this.program });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        if (this.renderer && this.program && canvas.parentElement) {
          const width = canvas.parentElement.clientWidth;
          const height = canvas.parentElement.clientHeight;
          this.renderer.setSize(width, height);
          this.program.uniforms.iResolution.value = new Vec3(width, height, width / height);
        }
      });

      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }

    } catch (error) {
      console.error('Failed to initialize WebGL for Threads:', error);
    }
  }

  private getActiveSpeaker(audioData: AudioData): 'user' | 'ai' | 'both' | 'none' {
    if (audioData.isSpeaking.user && audioData.isSpeaking.ai) return 'both';
    if (audioData.isSpeaking.user) return 'user';
    if (audioData.isSpeaking.ai) return 'ai';
    return 'none';
  }

  private combineFrequencies(
    userFreq: Uint8Array,
    aiFreq: Uint8Array,
    userVolume: number,
    aiVolume: number
  ): Uint8Array {
    const combined = new Uint8Array(userFreq.length);
    const totalVolume = userVolume + aiVolume || 1;

    for (let i = 0; i < combined.length; i++) {
      combined[i] = Math.floor(
        (userFreq[i] * userVolume + aiFreq[i] * aiVolume) / totalVolume
      );
    }

    return combined;
  }

  private getFrequencyBand(frequencies: Uint8Array, start: number, end: number): number {
    let sum = 0;
    for (let i = start; i < Math.min(end, frequencies.length); i++) {
      sum += frequencies[i];
    }
    return sum / (end - start);
  }

  cleanup() {
    // Hide container instead of removing it
    if (this.container) {
      this.container.style.display = 'none';
    }
    if (this.renderer) {
      const gl = this.renderer.gl;
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.container = null;
  }
}