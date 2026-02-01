// Chromatic Ripple - Motion-reactive color-separated waves
export const chromaticRippleShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Motion-reactive uniforms (auto-injected when camera enabled)
uniform float u_motionAmount; // 0-1 movement intensity
uniform vec2 u_bodyPosition; // normalized x,y body center
uniform float u_bodyPresent; // 0-1 presence detection

// Shader parameters
uniform float u_waveSpeed; // min:0 max:5 default:1.5 step:0.1
uniform float u_waveFrequency; // min:1 max:20 default:8 step:0.5
uniform float u_separation; // min:0 max:0.1 default:0.02 step:0.001
uniform float u_reactivity; // min:0 max:2 default:1.0 step:0.1

// Palette colors
uniform vec3 u_palette0; // color #1a0f2e
uniform vec3 u_palette1; // color #2d1b69
uniform vec3 u_palette2; // color #4a5899
uniform vec3 u_palette3; // color #7b9eb0
uniform vec3 u_palette4; // color #b4d4e1

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  // Calculate distance from body position
  vec2 bodyPos = u_bodyPosition;
  if(bodyPos.x == 0.0 && bodyPos.y == 0.0) {
    bodyPos = vec2(0.5, 0.5); // Default to center if no body detected
  }
  
  float distFromBody = length(uv - bodyPos);
  
  // Motion-reactive ripple effect
  float motionBoost = u_motionAmount * u_reactivity * u_bodyPresent;
  float ripple = sin(distFromBody * u_waveFrequency - u_time * u_waveSpeed + motionBoost * 10.0);
  
  // Chromatic separation based on motion
  float separation = u_separation * (1.0 + motionBoost);
  
  vec2 offset = normalize(uv - bodyPos) * separation;
  
  // Sample three color channels with offset
  float r = sin(length(uv + offset - bodyPos) * u_waveFrequency - u_time * u_waveSpeed) * 0.5 + 0.5;
  float g = sin(length(uv - bodyPos) * u_waveFrequency - u_time * u_waveSpeed) * 0.5 + 0.5;
  float b = sin(length(uv - offset - bodyPos) * u_waveFrequency - u_time * u_waveSpeed) * 0.5 + 0.5;
  
  // Create ripple color using palette
  vec3 rippleColor = mix(u_palette2, u_palette4, (r + g + b) / 3.0);
  
  // Mix with base color (darker palette)
  vec3 finalColor = mix(u_palette0, rippleColor, (ripple * 0.5 + 0.5) * (0.5 + motionBoost * 0.5));
  
  // Add glow when body is present and moving
  float glow = u_bodyPresent * motionBoost * 0.3;
  finalColor += u_palette3 * glow;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const chromaticRippleUniforms = {
  u_waveSpeed: 1.5,
  u_waveFrequency: 8.0,
  u_separation: 0.02,
  u_reactivity: 1.0,
  // Default palette: Deep Sleep
  u_palette0: [0.102, 0.059, 0.180], // #1a0f2e
  u_palette1: [0.176, 0.106, 0.412], // #2d1b69
  u_palette2: [0.290, 0.345, 0.600], // #4a5899
  u_palette3: [0.482, 0.620, 0.690], // #7b9eb0
  u_palette4: [0.706, 0.831, 0.882], // #b4d4e1
  // Motion uniforms (set by system)
  u_motionAmount: 0.0,
  u_bodyPosition: [0.5, 0.5],
  u_bodyPresent: 0.0,
};

export const chromaticRippleMeta = {
  id: 'chromatic-ripple',
  name: 'Chromatic Ripple',
  category: 'distortion' as const,
  description: 'Motion-reactive color-separated ripple waves',
  supportsMotionReactivity: true,
  uniformMeta: [
    { name: 'u_waveSpeed', type: 'float' as const, min: 0, max: 5, default: 1.5, step: 0.1, label: 'Wave Speed' },
    { name: 'u_waveFrequency', type: 'float' as const, min: 1, max: 20, default: 8.0, step: 0.5, label: 'Wave Frequency' },
    { name: 'u_separation', type: 'float' as const, min: 0, max: 0.1, default: 0.02, step: 0.001, label: 'Chromatic Separation' },
    { name: 'u_reactivity', type: 'float' as const, min: 0, max: 2, default: 1.0, step: 0.1, label: 'Motion Reactivity' },
  ]
};