import { useEffect, useRef, useState } from 'react';

interface ShaderLayerProps {
  mode: 'disabled' | 'shader-only' | 'shader-background';
  vertexShaderCode: string;
  fragmentShaderCode: string;
  uniforms: {
    [key: string]: number | number[];
  };
  onCompileError?: (error: string | null) => void;
  videoSource?: HTMLVideoElement | MediaStream | null; // Optional video source for aspect ratio matching
}

export function ShaderLayer(props: ShaderLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformLocationsRef = useRef<Map<string, WebGLUniformLocation>>(new Map());
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef(Date.now());
  
  // Debounce timer for shader compilation
  const compileTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [debouncedVertexCode, setDebouncedVertexCode] = useState(props.vertexShaderCode);
  const [debouncedFragmentCode, setDebouncedFragmentCode] = useState(props.fragmentShaderCode);

  // Debounce shader code changes (500ms delay)
  useEffect(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current);
    }

    compileTimerRef.current = setTimeout(() => {
      setDebouncedVertexCode(props.vertexShaderCode);
      setDebouncedFragmentCode(props.fragmentShaderCode);
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
      }
    };
  }, [props.vertexShaderCode, props.fragmentShaderCode]);

  // Compile shader
  const compileShader = (gl: WebGLRenderingContext, source: string, type: number): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', error);
      props.onCompileError?.(error);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  // Create shader program
  const createProgram = (gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null => {
    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      console.error('Program linking error:', error);
      props.onCompileError?.(error);
      gl.deleteProgram(program);
      return null;
    }

    props.onCompileError?.(null); // Clear errors on success
    return program;
  };

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || props.mode === 'disabled') return;

    const gl = canvas.getContext('webgl', { 
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Set canvas size based on video aspect ratio (only for uploaded videos, webcam stays full viewport)
    const resize = () => {
      if (!canvas) return;
      
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      // Only apply aspect ratio cropping for uploaded videos (HTMLVideoElement)
      // Webcam (MediaStream) should remain full viewport
      if (props.videoSource && props.videoSource instanceof HTMLVideoElement) {
        const videoWidth = props.videoSource.videoWidth || 0;
        const videoHeight = props.videoSource.videoHeight || 0;
        
        if (videoWidth > 0 && videoHeight > 0) {
          // Calculate canvas dimensions: full viewport height, width adjusted for video aspect ratio
          const videoAspect = videoWidth / videoHeight;
          canvasHeight = viewportHeight;
          canvasWidth = canvasHeight * videoAspect;
          shouldCenter = true;
        } else {
          // Video metadata not loaded yet, use full viewport
          canvasWidth = viewportWidth;
          canvasHeight = viewportHeight;
        }
      } else {
        // Webcam or no video source: use full viewport
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      gl.viewport(0, 0, canvasWidth, canvasHeight);
      
      // Update canvas positioning based on whether we're centering
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Also listen for video metadata loading to update size when video dimensions become available
    let handleLoadedMetadata: (() => void) | null = null;
    if (props.videoSource && props.videoSource instanceof HTMLVideoElement) {
      handleLoadedMetadata = () => {
        resize();
      };
      props.videoSource.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    return () => {
      window.removeEventListener('resize', resize);
      if (handleLoadedMetadata && props.videoSource && props.videoSource instanceof HTMLVideoElement) {
        props.videoSource.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [props.mode, props.videoSource]);

  // Add explicit effect to handle video source changes and trigger resize
  useEffect(() => {
    if (props.mode === 'disabled') return;
    
    // Force a resize when video source changes
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      const viewportHeight = document.documentElement.clientHeight;
      const viewportWidth = document.documentElement.clientWidth;
      
      let canvasWidth: number;
      let canvasHeight: number;
      let shouldCenter = false;
      
      if (props.videoSource && props.videoSource instanceof HTMLVideoElement) {
        const videoWidth = props.videoSource.videoWidth || 0;
        const videoHeight = props.videoSource.videoHeight || 0;
        
        if (videoWidth > 0 && videoHeight > 0) {
          const videoAspect = videoWidth / videoHeight;
          canvasHeight = viewportHeight;
          canvasWidth = canvasHeight * videoAspect;
          shouldCenter = true;
        } else {
          canvasWidth = viewportWidth;
          canvasHeight = viewportHeight;
        }
      } else {
        canvasWidth = viewportWidth;
        canvasHeight = viewportHeight;
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      const gl = glRef.current;
      if (gl) {
        gl.viewport(0, 0, canvasWidth, canvasHeight);
      }
      
      if (shouldCenter) {
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
      } else {
        canvas.style.left = '0';
        canvas.style.transform = 'none';
      }
    };
    
    // Small delay to ensure video element is ready
    const timeoutId = setTimeout(() => {
      resize();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [props.videoSource, props.mode]);

  // Compile shader when code changes
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || props.mode === 'disabled') return;
    
    // Validate shader code before attempting compilation
    if (!debouncedVertexCode || !debouncedFragmentCode) {
      console.warn('Shader code is empty or undefined');
      return;
    }

    const program = createProgram(gl, debouncedVertexCode, debouncedFragmentCode);
    if (!program) return;

    programRef.current = program;

    // Get uniform locations
    uniformLocationsRef.current.clear();
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        const location = gl.getUniformLocation(program, info.name);
        if (location) {
          uniformLocationsRef.current.set(info.name, location);
        }
      }
    }

  }, [debouncedVertexCode, debouncedFragmentCode, props.mode]);

  // Render loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !canvas || props.mode === 'disabled') return;

    const render = () => {
      if (!gl || !program || !canvas) return;

      gl.useProgram(program);

      // Set vertex attribute
      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Set built-in uniforms
      const timeLocation = uniformLocationsRef.current.get('u_time');
      if (timeLocation) {
        const time = (Date.now() - startTimeRef.current) / 1000;
        gl.uniform1f(timeLocation, time);
      }

      const resolutionLocation = uniformLocationsRef.current.get('u_resolution');
      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      }

      // Set custom uniforms
      Object.entries(props.uniforms).forEach(([name, value]) => {
        const location = uniformLocationsRef.current.get(name);
        if (location) {
          if (typeof value === 'number') {
            gl.uniform1f(location, value);
          } else if (Array.isArray(value)) {
            if (value.length === 2) {
              gl.uniform2f(location, value[0], value[1]);
            } else if (value.length === 3) {
              gl.uniform3f(location, value[0], value[1], value[2]);
            } else if (value.length === 4) {
              gl.uniform4f(location, value[0], value[1], value[2], value[3]);
            }
          }
        }
      });

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [props.mode, props.uniforms]);

  if (props.mode === 'disabled') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0"
      style={{ 
        // Always render shader background at zIndex 1 so it sits below grid/raw video/body effects
        zIndex: 1,
        pointerEvents: 'none',
        display: 'block', // Remove inline spacing
        margin: 0,
        padding: 0,
        // Width, height, left, and transform are set dynamically in JavaScript
        // For uploaded videos: centered with aspect ratio
        // For webcam: full viewport (left: 0, no transform)
      }}
    />
  );
}