"use client";

import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

interface AudioVisualizerProps {
  inputStream?: MediaStream;
  outputStream?: MediaStream;
  className?: string;
}

interface SceneData {
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  composer?: EffectComposer;
  sphere?: THREE.Mesh;
  backdrop?: THREE.Mesh;
  inputAnalyser?: AnalyserNode;
  outputAnalyser?: AnalyserNode;
  audioContext?: AudioContext;
  animationId?: number;
  rotation: THREE.Vector3;
  prevTime: number;
  particles?: THREE.Points;
  lights?: THREE.PointLight[];
}

// Commented out as it's no longer used after removing the sphere
// interface CustomMaterial extends THREE.ShaderMaterial {
//   userData: {
//     shader?: THREE.ShaderMaterial;
//   };
// }

const AudioVisualizer3DComponent = ({ inputStream, outputStream, className }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneData>({
    rotation: new THREE.Vector3(0, 0, 0),
    prevTime: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [use3D, setUse3D] = useState(false);

  // Only log once per mount, not on every render
  useEffect(() => {
    console.log('🎨 AudioVisualizer3D mounted', { 
      hasInputData: !!inputStream, 
      hasOutputData: !!outputStream,
      inputTracks: inputStream?.getTracks().length || 0,
      outputTracks: outputStream?.getTracks().length || 0
    });
  }, []);

  // Check if we can use WebGL
  useEffect(() => {
    console.log('🔍 Checking WebGL support...');
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const webglSupported = !!gl;
    console.log('🎯 WebGL support:', webglSupported);
    setUse3D(webglSupported);
    
    // Remove forced 2D mode - let it use 3D if supported
    console.log('✅ Using', webglSupported ? '3D WebGL' : '2D Canvas', 'mode');
  }, []);

  // Audio analyzer setup
  useEffect(() => {
    // Clean up previous audio context
    if (sceneRef.current.audioContext && sceneRef.current.audioContext.state !== 'closed') {
      sceneRef.current.audioContext.close();
      sceneRef.current.audioContext = undefined;
    }

    if (!inputStream && !outputStream) return;

    let audioContext: AudioContext | undefined;
    
    const setupAudioAnalysis = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        sceneRef.current.audioContext = audioContext;
        console.log('Audio context created:', audioContext.state);

        // Setup input analyzer
        if (inputStream) {
          try {
            const inputSource = audioContext.createMediaStreamSource(inputStream);
            const inputAnalyser = audioContext.createAnalyser();
            inputAnalyser.fftSize = 256;
            inputAnalyser.smoothingTimeConstant = 0.8;
            inputSource.connect(inputAnalyser);
            sceneRef.current.inputAnalyser = inputAnalyser;
            console.log('Input analyzer setup successful');
          } catch (error) {
            console.warn('Failed to create input analyzer:', error);
          }
        }

        // Setup output analyzer  
        if (outputStream) {
          try {
            const outputSource = audioContext.createMediaStreamSource(outputStream);
            const outputAnalyser = audioContext.createAnalyser();
            outputAnalyser.fftSize = 256;
            outputAnalyser.smoothingTimeConstant = 0.8;
            outputSource.connect(outputAnalyser);
            sceneRef.current.outputAnalyser = outputAnalyser;
            console.log('Output analyzer setup successful');
          } catch (error) {
            console.warn('Failed to create output analyzer:', error);
          }
        }
      } catch (error) {
        console.error('Failed to setup audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch((error) => {
          console.warn('Failed to close audio context:', error);
        });
      }
    };
  }, [inputStream, outputStream]);

  // Initialize Three.js scene (only if WebGL is available)
  useEffect(() => {
    if (!canvasRef.current || isInitialized || !use3D) {
      console.log('Skipping 3D init:', { 
        hasCanvas: !!canvasRef.current, 
        isInitialized, 
        use3D 
      });
      return;
    }

    console.log('Initializing Three.js scene...');
    const canvas = canvasRef.current;
    
    // Don't check for existing context - just try to create WebGL context directly
    // If it fails, the useEffect dependencies will cause a re-run with use3D set to false
    let gl: WebGLRenderingContext | null = null;
    try {
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      gl = context as WebGLRenderingContext | null;
      if (!gl) {
        console.warn('Failed to create WebGL context, falling back to 2D mode');
        setUse3D(false);
        return;
      }
    } catch (error) {
      console.warn('WebGL context creation failed:', error);
      setUse3D(false);
      return;
    }
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    // Commenting out animated backdrop to remove the background sphere
    /* const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(25, 5),
      new THREE.ShaderMaterial({
        uniforms: {
          resolution: { value: new THREE.Vector2(1, 1) },
          time: { value: 0 },
          audioLevel: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          uniform float time;
          uniform float audioLevel;
          
          void main() {
            vUv = uv;
            vPosition = position;
            
            // Add slight movement to backdrop based on audio
            vec3 pos = position;
            float wave = sin(pos.x * 0.1 + time * 0.5) * cos(pos.y * 0.1 + time * 0.3);
            pos += normalize(pos) * wave * audioLevel * 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec2 resolution;
          uniform float time;
          uniform float audioLevel;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          float noise(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          }
          
          float fbm(vec3 p) {
            float value = 0.0;
            float amplitude = 0.5;
            for(int i = 0; i < 6; i++) {
              value += amplitude * noise(p);
              p *= 2.0;
              amplitude *= 0.5;
            }
            return value;
          }
          
          void main() {
            vec3 color1 = vec3(0.1, 0.05, 0.3);  // Deep purple
            vec3 color2 = vec3(0.05, 0.2, 0.4);  // Deep blue
            vec3 color3 = vec3(0.2, 0.1, 0.5);   // Purple
            
            float n1 = fbm(vPosition * 0.02 + time * 0.02);
            float n2 = fbm(vPosition * 0.05 + time * 0.03);
            
            // Create flowing colors
            vec3 color = mix(color1, color2, n1);
            color = mix(color, color3, n2);
            
            // Add audio-reactive brightness
            color += audioLevel * 0.3 * vec3(0.2, 0.4, 0.8);
            
            // Add subtle star-like points
            float stars = step(0.98, noise(vPosition * 50.0 + time * 0.1));
            color += stars * 0.8;
            
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.BackSide,
      })
    );
    scene.add(backdrop);
    sceneRef.current.backdrop = backdrop; */

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 6);

    // Create renderer using the existing WebGL context
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      context: gl,
      antialias: true,
      alpha: true 
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Commenting out the main reactive sphere to remove the circle from all visualizations
    /* const geometry = new THREE.IcosahedronGeometry(1.2, 12);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        inputData: { value: new THREE.Vector4() },
        outputData: { value: new THREE.Vector4() },
        cameraPosition: { value: camera.position },
      },
      vertexShader: `
        uniform float time;
        uniform vec4 inputData;
        uniform vec4 outputData;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        
        void main() {
          vNormal = normal;
          vPosition = position;
          
          vec3 pos = position;
          float radius = length(pos);
          vec3 dir = normalize(pos);
          
          // Multiple wave layers for complex displacement
          float wave1 = sin(inputData.z * pos.x + time * 2.0) * inputData.x * inputData.y;
          float wave2 = cos(outputData.z * pos.y + time * 1.5) * outputData.x * outputData.y;
          float wave3 = sin(pos.z * 8.0 + time * 3.0) * 0.05;
          
          // Add noise-based displacement
          float n = noise(pos * 5.0 + time * 0.1) * 0.1;
          
          // Combine all displacements
          float displacement = (wave1 + wave2 + wave3 + n) * 0.4;
          vDisplacement = displacement;
          
          // Apply displacement
          vec3 newPosition = pos + dir * displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec4 inputData;
        uniform vec4 outputData;
        uniform vec3 cameraPosition;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDisplacement;
        
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - dot(vNormal, viewDirection);
          
          // Base colors
          vec3 baseColor = vec3(0.1, 0.3, 0.8);  // Blue base
          vec3 inputColor = vec3(0.8, 0.2, 0.9);  // Purple for input
          vec3 outputColor = vec3(0.2, 0.8, 0.9); // Cyan for output
          
          // Mix colors based on audio levels
          vec3 color = baseColor;
          color = mix(color, inputColor, inputData.x * inputData.y * 2.0);
          color = mix(color, outputColor, outputData.x * outputData.y * 2.0);
          
          // Add displacement-based coloring
          color += abs(vDisplacement) * vec3(1.0, 0.5, 0.0) * 3.0;
          
          // Enhanced fresnel effect
          color += fresnel * fresnel * vec3(0.5, 0.8, 1.0) * 2.0;
          
          // Pulsing effect
          float pulse = sin(time * 4.0) * 0.1 + 0.9;
          color *= pulse;
          
          // Add some emissive glow
          color += 0.3;
          
          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    }) as CustomMaterial;

    // Initialize userData for the new shader material
    sphereMaterial.userData = { shader: sphereMaterial };

    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);
    sceneRef.current.sphere = sphere; */

    // Add floating particle system
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const particles = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      particles[i] = (Math.random() - 0.5) * 20;     // x
      particles[i + 1] = (Math.random() - 0.5) * 20; // y
      particles[i + 2] = (Math.random() - 0.5) * 20; // z
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioLevel: { value: 0 },
      },
      vertexShader: `
        uniform float time;
        uniform float audioLevel;
        
        void main() {
          vec3 pos = position;
          
          // Float particles
          pos.y += sin(time * 0.5 + pos.x * 0.1) * 0.5;
          pos.x += cos(time * 0.3 + pos.z * 0.1) * 0.3;
          
          // Audio reactive movement
          pos += normalize(pos) * audioLevel * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 3.0 + audioLevel * 5.0;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          float alpha = 1.0 - distance * 2.0;
          gl_FragColor = vec4(0.8, 0.9, 1.0, alpha * 0.6);
        }
      `,
      transparent: true,
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Enhanced dynamic lighting
    const ambientLight = new THREE.AmbientLight(0x404080, 0.2);
    scene.add(ambientLight);

    // Animated point lights
    const light1 = new THREE.PointLight(0x00aaff, 3, 100);
    light1.position.set(8, 8, 8);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xff4400, 2.5, 100);
    light2.position.set(-8, -8, 8);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xaa00ff, 2, 100);
    light3.position.set(0, 8, -8);
    scene.add(light3);

    // Setup enhanced post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      4.0,   // Increased bloom strength
      0.6,   // Bloom radius
      0.7    // Bloom threshold
    );
    composer.addPass(bloomPass);

    // Store references
    sceneRef.current.scene = scene;
    sceneRef.current.camera = camera;
    sceneRef.current.renderer = renderer;
    sceneRef.current.composer = composer;
    sceneRef.current.particles = particleSystem;
    sceneRef.current.lights = [light1, light2, light3];

    console.log('Enhanced Three.js scene initialized successfully');
    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      
      // Update backdrop resolution - commented out with backdrop
      // if (backdrop.material instanceof THREE.ShaderMaterial) {
      //   backdrop.material.uniforms.resolution.value.set(width, height);
      // }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      console.log('Cleaning up enhanced Three.js scene');
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      // geometry.dispose(); // Commented out with sphere
      // sphereMaterial.dispose(); // Commented out with sphere
      particleGeometry.dispose();
      particleMaterial.dispose();
    };
  }, [isInitialized, use3D]);

  // 3D Animation loop
  useEffect(() => {
    if (!isInitialized || !use3D) {
      console.log('Skipping 3D animation:', { isInitialized, use3D });
      return;
    }

    console.log('Starting enhanced 3D animation loop');
    const animate = () => {
      const { 
        composer, 
        // sphere, 
        // backdrop, 
        inputAnalyser, 
        outputAnalyser,
        camera,
        rotation,
        particles,
        lights
      } = sceneRef.current;

      if (!composer || !camera) {
        console.warn('Missing 3D scene components');
        return;
      }

      const t = performance.now();
      const dt = (t - sceneRef.current.prevTime) / (1000 / 60);
      sceneRef.current.prevTime = t;

      // Get audio data
      const inputData = new Uint8Array(128);
      const outputData = new Uint8Array(128);
      
      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputData);
      }
      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(outputData);
      }

      // Calculate volumes and frequencies
      const inputVolume = inputData.reduce((a, b) => a + b, 0) / inputData.length;
      const outputVolume = outputData.reduce((a, b) => a + b, 0) / outputData.length;
      
      // Get frequency data for more detailed analysis
      const inputLow = inputData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const inputMid = inputData.slice(10, 50).reduce((a, b) => a + b, 0) / 40;
      const inputHigh = inputData.slice(50, 128).reduce((a, b) => a + b, 0) / 78;
      
      const outputLow = outputData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const outputMid = outputData.slice(10, 50).reduce((a, b) => a + b, 0) / 40;
      const outputHigh = outputData.slice(50, 128).reduce((a, b) => a + b, 0) / 78;

      // Combined audio level for global effects
      const totalAudioLevel = (inputVolume + outputVolume) / 2;

      // Backdrop update code commented out
      // const backdropMaterial = backdrop.material as THREE.ShaderMaterial;
      // backdropMaterial.uniforms.time.value = t * 0.001;
      // backdropMaterial.uniforms.audioLevel.value = totalAudioLevel / 255;

      // Sphere update code commented out
      // const sphereMaterial = sphere.material as THREE.ShaderMaterial;
      
      // Sphere scaling commented out
      // const baseScale = 1.0;
      // const audioScale = (totalAudioLevel / 255) * 0.8;
      // const pulseScale = Math.sin(t * 0.005) * 0.1;
      // sphere.scale.setScalar(baseScale + audioScale + pulseScale);

      // Sphere shader uniforms update commented out
      // sphereMaterial.uniforms.time.value = t * 0.002;
      // sphereMaterial.uniforms.inputData.value.set(
      //   inputVolume / 255,
      //   Math.max(inputLow, inputMid, inputHigh) / 255,
      //   (inputMid / 255) * 20 + t * 0.001,
      //   0
      // );
      // sphereMaterial.uniforms.outputData.value.set(
      //   outputVolume / 255,
      //   Math.max(outputLow, outputMid, outputHigh) / 255,
      //   (outputMid / 255) * 15 + t * 0.0008,
      //   0
      // );
      // sphereMaterial.uniforms.cameraPosition.value.copy(camera.position);

      // Update particle system if available
      if (particles) {
        const particleMaterial = particles.material as THREE.ShaderMaterial;
        particleMaterial.uniforms.time.value = t * 0.001;
        particleMaterial.uniforms.audioLevel.value = totalAudioLevel / 255;
      }

      // Animate lights based on audio
      if (lights && lights.length >= 3) {
        const [light1, light2, light3] = lights;
        
        // Light 1 - responds to input (user voice)
        light1.intensity = 2 + (inputVolume / 255) * 8;
        light1.position.x = 8 + Math.sin(t * 0.001 + inputMid * 0.01) * 3;
        light1.position.y = 8 + Math.cos(t * 0.0015 + inputHigh * 0.01) * 3;
        
        // Light 2 - responds to output (AI voice)
        light2.intensity = 2 + (outputVolume / 255) * 6;
        light2.position.x = -8 + Math.cos(t * 0.0012 + outputMid * 0.01) * 3;
        light2.position.z = 8 + Math.sin(t * 0.0008 + outputLow * 0.01) * 2;
        
        // Light 3 - ambient movement
        light3.intensity = 1.5 + (totalAudioLevel / 255) * 4;
        light3.position.x = Math.sin(t * 0.0006) * 6;
        light3.position.y = 8 + Math.cos(t * 0.0004) * 4;
      }

      // Enhanced camera movement
      const targetRotationSpeed = 0.0008;
      const audioInfluence = (totalAudioLevel / 255) * 0.5;
      
      rotation.x += dt * targetRotationSpeed * (0.5 + audioInfluence);
      rotation.y += dt * targetRotationSpeed * (0.7 + audioInfluence);
      rotation.z += dt * targetRotationSpeed * 0.3;

      // Dynamic camera distance and position
      const baseDistance = 6;
      const audioDistance = (totalAudioLevel / 255) * 2;
      const breathingDistance = Math.sin(t * 0.002) * 0.5;
      const distance = baseDistance + audioDistance + breathingDistance;

      camera.position.x = Math.cos(rotation.y) * distance;
      camera.position.z = Math.sin(rotation.y) * distance;
      camera.position.y = Math.sin(rotation.x) * 3 + Math.cos(t * 0.001) * 1;
      camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at center instead of sphere

      // Debug audio levels less frequently
      if (Math.floor(t / 1000) % 3 === 0 && Math.floor(t / 16) % 120 === 0) {
        console.log('Enhanced audio levels:', { 
          inputVolume, 
          outputVolume, 
          totalAudioLevel,
          inputFreqs: { low: inputLow, mid: inputMid, high: inputHigh },
          outputFreqs: { low: outputLow, mid: outputMid, high: outputHigh }
        });
      }

      composer.render();
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
    };
  }, [isInitialized, use3D]);

  // Fallback 2D Canvas Animation (only run if 3D is not available)
  useEffect(() => {
    console.log('🎬 2D Animation effect triggered', { use3D, isInitialized });
    
    // Only run 2D if we're not using 3D and not initialized (meaning 3D failed)
    if (use3D || isInitialized) {
      console.log('⏭️ Skipping 2D animation', { use3D, isInitialized });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ No canvas for 2D animation');
      return;
    }

    console.log('🚀 Starting 2D fallback animation');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Failed to get 2D context');
      return;
    }
    
    let time = 0;
    let frameCount = 0;
    
    const animate2D = () => {
      frameCount++;
      if (frameCount % 60 === 0) {
        console.log('🎬 2D Animation running, frame:', frameCount);
      }
      
      const { inputAnalyser, outputAnalyser } = sceneRef.current;
      
      const width = canvas.width;
      const height = canvas.height;

      // Always show something - test pattern
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
      gradient.addColorStop(0, `hsl(${time * 0.5}, 70%, 20%)`);
      gradient.addColorStop(1, '#100c14');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Commenting out the test circle
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.1;
      // const pulseRadius = baseRadius + Math.sin(time * 0.1) * 20;
      
      // ctx.fillStyle = `hsl(${time * 2}, 80%, 60%)`;
      // ctx.beginPath();
      // ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      // ctx.fill();

      time += 1;

      // Get audio data
      const inputData = new Uint8Array(128);
      const outputData = new Uint8Array(128);
      
      if (inputAnalyser) {
        inputAnalyser.getByteFrequencyData(inputData);
      }
      if (outputAnalyser) {
        outputAnalyser.getByteFrequencyData(outputData);
      }

      // Calculate volumes
      const inputVolume = inputData.reduce((a, b) => a + b, 0) / inputData.length;
      const outputVolume = outputData.reduce((a, b) => a + b, 0) / outputData.length;

      // Add audio-reactive elements if we have audio
      if (inputVolume > 0 || outputVolume > 0) {
        const reactiveRadius = baseRadius + ((outputVolume + inputVolume) / 2 / 255) * 50;

        // Commenting out pulsing circle effect
        // const pulseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, reactiveRadius);
        // pulseGradient.addColorStop(0, `rgba(100, 200, 255, ${0.8 * (outputVolume / 255)})`);
        // pulseGradient.addColorStop(0.7, `rgba(150, 100, 255, ${0.4 * (outputVolume / 255)})`);
        // pulseGradient.addColorStop(1, 'rgba(255, 100, 150, 0)');

        // ctx.fillStyle = pulseGradient;
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, reactiveRadius, 0, Math.PI * 2);
        // ctx.fill();

        // Frequency visualization
        const numBars = 64;
        const maxBarLength = Math.min(width, height) * 0.2;
        
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2;
          const dataIndex = Math.floor((i / numBars) * inputData.length);
          
          // Input bars
          const inputBarLength = (inputData[dataIndex] / 255) * maxBarLength * 0.6;
          const inputStartX = centerX + Math.cos(angle) * (reactiveRadius + 20);
          const inputStartY = centerY + Math.sin(angle) * (reactiveRadius + 20);
          const inputEndX = centerX + Math.cos(angle) * (reactiveRadius + 20 + inputBarLength);
          const inputEndY = centerY + Math.sin(angle) * (reactiveRadius + 20 + inputBarLength);

          ctx.strokeStyle = `hsl(${320 + i * 2}, 70%, ${50 + (inputData[dataIndex] / 255) * 30}%)`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(inputStartX, inputStartY);
          ctx.lineTo(inputEndX, inputEndY);
          ctx.stroke();

          // Output bars
          const outputBarLength = (outputData[dataIndex] / 255) * maxBarLength;
          const outputStartX = centerX + Math.cos(angle) * (reactiveRadius + 40 + inputBarLength);
          const outputStartY = centerY + Math.sin(angle) * (reactiveRadius + 40 + inputBarLength);
          const outputEndX = centerX + Math.cos(angle) * (reactiveRadius + 40 + inputBarLength + outputBarLength);
          const outputEndY = centerY + Math.sin(angle) * (reactiveRadius + 40 + inputBarLength + outputBarLength);

          ctx.strokeStyle = `hsl(${200 + i * 3}, 80%, ${60 + (outputData[dataIndex] / 255) * 40}%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(outputStartX, outputStartY);
          ctx.lineTo(outputEndX, outputEndY);
          ctx.stroke();
        }
      }

      sceneRef.current.animationId = requestAnimationFrame(animate2D);
    };

    animate2D();

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
    };
  }, [use3D, isInitialized]);

  // Set canvas size properly
  useEffect(() => {
    console.log('📏 Setting up canvas sizing...');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ No canvas ref');
      return;
    }

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      console.log('📐 Canvas dimensions:', { width: rect.width, height: rect.height });
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <canvas
      key={use3D ? '3d' : '2d'} // Force recreation when switching modes
      ref={canvasRef}
      className={`w-full h-full ${className || ''}`}
      style={{ 
        display: 'block',
        objectFit: 'cover',
        backgroundColor: use3D ? 'transparent' : '#100c14' // Add background for debugging
      }}
    />
  );
};

export const AudioVisualizer3D = memo(AudioVisualizer3DComponent); 