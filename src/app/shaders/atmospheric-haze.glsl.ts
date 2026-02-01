// Atmospheric Haze - Cinematic gradient with noise and haze
export const atmosphericHazeShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Shader parameters
uniform float u_speed; // min:0 max:3 default:1.0 step:0.1
uniform float u_intensity; // min:0 max:1 default:0.5 step:0.01
uniform float u_scale; // min:0.1 max:5 default:1.5 step:0.1

// Palette colors (optional - will fallback to u_color1/u_color2 if not present)
uniform vec3 u_palette0; // color #1a0f2e
uniform vec3 u_palette1; // color #2d1b69
uniform vec3 u_palette2; // color #4a5899
uniform vec3 u_palette3; // color #7b9eb0
uniform vec3 u_palette4; // color #b4d4e1

// Simple noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  
  for(int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  // Animated noise layers
  vec2 noiseCoord = uv * u_scale + vec2(u_time * u_speed * 0.05, u_time * u_speed * 0.03);
  float n1 = fbm(noiseCoord);
  
  vec2 noiseCoord2 = uv * u_scale * 1.5 + vec2(-u_time * u_speed * 0.03, u_time * u_speed * 0.07);
  float n2 = fbm(noiseCoord2);
  
  // Combine noise layers
  float combinedNoise = mix(n1, n2, 0.5);
  
  // Create vertical gradient
  float gradient = uv.y + (combinedNoise - 0.5) * u_intensity;
  
  // Use palette colors (bottom to top: darker to lighter)
  vec3 hazeColor = mix(u_palette1, u_palette3, smoothstep(0.2, 0.8, gradient));
  
  // Add atmosphere
  float vignette = 1.0 - length(uv - 0.5) * 0.5;
  hazeColor *= vignette;
  
  gl_FragColor = vec4(hazeColor, 1.0);
}
`;

export const atmosphericHazeUniforms = {
  u_speed: 1.0,
  u_intensity: 0.5,
  u_scale: 1.5,
  // Default palette: Deep Sleep
  u_palette0: [0.102, 0.059, 0.180], // #1a0f2e
  u_palette1: [0.176, 0.106, 0.412], // #2d1b69
  u_palette2: [0.290, 0.345, 0.600], // #4a5899
  u_palette3: [0.482, 0.620, 0.690], // #7b9eb0
  u_palette4: [0.706, 0.831, 0.882], // #b4d4e1
};

export const atmosphericHazeMeta = {
  id: 'atmospheric-haze',
  name: 'Atmospheric Haze',
  category: 'background' as const,
  description: 'Cinematic gradient with flowing noise and haze',
  supportsMotionReactivity: false,
  uniformMeta: [
    { name: 'u_speed', type: 'float' as const, min: 0, max: 3, default: 1.0, step: 0.1, label: 'Speed' },
    { name: 'u_intensity', type: 'float' as const, min: 0, max: 1, default: 0.5, step: 0.01, label: 'Intensity' },
    { name: 'u_scale', type: 'float' as const, min: 0.1, max: 5, default: 1.5, step: 0.1, label: 'Scale' },
  ]
};