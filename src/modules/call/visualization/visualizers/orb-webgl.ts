import { Renderer, Program, Mesh, Triangle, Vec3 } from "ogl";
import type { AudioVisualizer, AudioData } from '../types';

export class OrbWebGLVisualizer implements AudioVisualizer {
  id = 'orb-webgl';
  name = 'Orb';
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private container: HTMLDivElement | null = null;
  private time = 0;
  private currentHue = 230;
  private targetHue = 230;
  private currentHover = 0;
  private targetHover = 0;
  private rotation = 0;
  private currentScale = 1.0;
  private targetScale = 1.0;

  private vert = /* glsl */ `
    precision highp float;
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
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    uniform float scale;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }
    
    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956 * c.y + 0.621 * c.z;
      float g = c.x - 0.272 * c.y - 0.647 * c.z;
      float b = c.x - 1.106 * c.y + 1.703 * c.z;
      return vec3(r, g, b);
    }
    
    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad);
      float sinA = sin(hueRad);
      float i = yiq.y * cosA - yiq.z * sinA;
      float q = yiq.y * sinA + yiq.z * cosA;
      yiq.y = i;
      yiq.z = q;
      return yiq2rgb(yiq);
    }
    
    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0 * fract(vec3(
        p3.x + p3.y,
        p3.x + p3.z,
        p3.y + p3.z
      ) * p3.zyx);
    }
    
    float snoise3(vec3 p) {
      const float K1 = 0.333333333;
      const float K2 = 0.166666667;
      vec3 i = floor(p + (p.x + p.y + p.z) * K1);
      vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e * (1.0 - e.zxy);
      vec3 i2 = 1.0 - e.zxy * (1.0 - e);
      vec3 d1 = d0 - (i1 - K2);
      vec3 d2 = d0 - (i2 - K1);
      vec3 d3 = d0 - 0.5;
      vec4 h = max(0.6 - vec4(
        dot(d0, d0),
        dot(d1, d1),
        dot(d2, d2),
        dot(d3, d3)
      ), 0.0);
      vec4 n = h * h * h * h * vec4(
        dot(d0, hash33(i)),
        dot(d1, hash33(i + i1)),
        dot(d2, hash33(i + i2)),
        dot(d3, hash33(i + 1.0))
      );
      return dot(vec4(31.316), n);
    }
    
    vec4 extractAlpha(vec3 colorIn) {
      float a = max(max(colorIn.r, colorIn.g), colorIn.b);
      return vec4(colorIn.rgb / (a + 1e-5), a);
    }
    
    const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6;
    const float noiseScale = 0.65;
    
    float light1(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * attenuation);
    }
    
    float light2(float intensity, float attenuation, float dist) {
      return intensity / (1.0 + dist * dist * attenuation);
    }
    
    vec4 draw(vec2 uv) {
      vec3 color1 = adjustHue(baseColor1, hue);
      vec3 color2 = adjustHue(baseColor2, hue);
      vec3 color3 = adjustHue(baseColor3, hue);
      
      float ang = atan(uv.y, uv.x);
      float len = length(uv);
      float invLen = len > 0.0 ? 1.0 / len : 0.0;
      
      float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
      float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
      float d0 = distance(uv, (r0 * invLen) * uv);
      float v0 = light1(1.0, 10.0, d0);
      v0 *= smoothstep(r0 * 1.05, r0, len);
      float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
      
      float a = iTime * -1.0;
      vec2 pos = vec2(cos(a), sin(a)) * r0;
      float d = distance(uv, pos);
      float v1 = light2(1.5, 5.0, d);
      v1 *= light1(1.0, 50.0, d0);
      
      float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
      float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
      
      vec3 col = mix(color1, color2, cl);
      col = mix(color3, col, v0);
      col = (col + v1) * v2 * v3;
      col = clamp(col, 0.0, 1.0);
      
      return extractAlpha(col);
    }
    
    vec4 mainImage(vec2 fragCoord) {
      vec2 center = iResolution.xy * 0.5;
      float size = min(iResolution.x, iResolution.y);
      vec2 uv = (fragCoord - center) / size * 2.0;
      
      // Apply scale to make orb bigger/smaller based on volume
      uv /= scale;
      
      float angle = rot;
      float s = sin(angle);
      float c = cos(angle);
      uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
      
      uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
      uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
      
      return draw(uv);
    }
    
    void main() {
      vec2 fragCoord = vUv * iResolution.xy;
      vec4 col = mainImage(fragCoord);
      gl_FragColor = vec4(col.rgb * col.a, col.a);
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

    // Determine speaker and set hue
    const speaker = this.getActiveSpeaker(audioData);
    switch(speaker) {
      case 'user':
        this.targetHue = 330; // Pink hue
        break;
      case 'ai':
        this.targetHue = 190; // Cyan hue
        break;
      case 'both':
        this.targetHue = 270; // Purple hue
        break;
      default:
        this.targetHue = 230; // Default purple-blue
    }


    // Audio response - now with dynamic scaling
    const combinedVolume = Math.max(audioData.userVolume, audioData.aiVolume);
    
    // Scale orb based on volume (0.8 to 1.4 range for visible effect)
    this.targetScale = 0.8 + (combinedVolume * 0.6);
    
    // When there's audio, trigger hover state
    if (combinedVolume > 0.05) {
      this.targetHover = 1; // Full hover state when speaking
    } else {
      this.targetHover = 0;
    }

    // Smooth transitions
    this.currentHue += (this.targetHue - this.currentHue) * 0.1;
    this.currentHover += (this.targetHover - this.currentHover) * 0.1;
    this.currentScale += (this.targetScale - this.currentScale) * 0.15; // Faster response for scale
    
    // Gentle rotation when speaking
    if (combinedVolume > 0.1) {
      this.rotation += 0.01;
    }

    // Update uniforms
    if (this.program) {
      this.program.uniforms.iTime.value = this.time;
      this.program.uniforms.hue.value = this.currentHue;
      this.program.uniforms.hover.value = this.currentHover;
      this.program.uniforms.rot.value = this.rotation;
      this.program.uniforms.scale.value = this.currentScale;
      // Dynamic hover intensity based on audio (0.3 to 0.8 range)
      this.program.uniforms.hoverIntensity.value = 0.3 + (combinedVolume * 0.5);
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
      this.container.style.top = '50%';
      this.container.style.left = '50%';
      this.container.style.transform = 'translate(-50%, -50%)';
      this.container.style.width = '500px';
      this.container.style.height = '500px';
      this.container.style.pointerEvents = 'none';
      this.container.style.zIndex = '10';

      // Add to canvas parent
      if (canvas.parentElement) {
        canvas.parentElement.appendChild(this.container);
      }

      // Create renderer
      this.renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        width: 500,
        height: 500,
        dpr: window.devicePixelRatio || 1
      });

      const gl = this.renderer.gl;
      gl.clearColor(0, 0, 0, 0);

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
            value: new Vec3(500, 500, 1)
          },
          hue: { value: 230 },
          hover: { value: 0 },
          rot: { value: 0 },
          scale: { value: 1.0 },
          hoverIntensity: { value: 0.5 }
        }
      });

      this.mesh = new Mesh(gl, { geometry, program: this.program });

    } catch (error) {
      console.error('Failed to initialize WebGL for Orb:', error);
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