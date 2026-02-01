// Liquid Gradient - Smooth flowing organic color transitions
export const liquidGradientShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Shader parameters
uniform float u_speed; // min:0 max:3 default:0.8 step:0.1
uniform float u_viscosity; // min:0 max:2 default:1.0 step:0.1
uniform float u_complexity; // min:1 max:8 default:4 step:1

// Palette colors (use mood palette instead of individual colors)
uniform vec3 u_palette0; // color #1a0f2e
uniform vec3 u_palette1; // color #2d1b69
uniform vec3 u_palette2; // color #4a5899
uniform vec3 u_palette3; // color #7b9eb0
uniform vec3 u_palette4; // color #b4d4e1

// Smooth noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  int octaves = int(u_complexity);
  
  for(int i = 0; i < 8; i++) {
    if(i >= octaves) break;
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  // Create flowing distortion
  float t = u_time * u_speed * 0.1;
  vec2 flow1 = vec2(fbm(uv * u_viscosity + t), fbm(uv * u_viscosity + t + 100.0));
  vec2 flow2 = vec2(fbm(uv * u_viscosity * 1.5 - t * 0.7), fbm(uv * u_viscosity * 1.5 - t * 0.7 + 200.0));
  
  // Combine flows
  vec2 distortedUV = uv + flow1 * 0.2 + flow2 * 0.15;
  
  // Create organic gradient field
  float field1 = fbm(distortedUV * 2.0 + t * 0.5);
  float field2 = fbm(distortedUV * 3.0 - t * 0.3);
  
  // Mix palette colors based on field values (darker to lighter)
  vec3 color = mix(u_palette1, u_palette2, smoothstep(0.3, 0.7, field1));
  color = mix(color, u_palette3, smoothstep(0.4, 0.8, field2));
  
  // Add subtle glow
  float glow = 1.0 - length(uv - 0.5) * 0.3;
  color *= glow;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const liquidGradientUniforms = {
  u_speed: 0.8,
  u_viscosity: 1.0,
  u_complexity: 4,
  // Default palette: Deep Sleep
  u_palette0: [0.102, 0.059, 0.180], // #1a0f2e
  u_palette1: [0.176, 0.106, 0.412], // #2d1b69
  u_palette2: [0.290, 0.345, 0.600], // #4a5899
  u_palette3: [0.482, 0.620, 0.690], // #7b9eb0
  u_palette4: [0.706, 0.831, 0.882], // #b4d4e1
};

export const liquidGradientMeta = {
  id: 'liquid-gradient',
  name: 'Liquid Gradient',
  category: 'background' as const,
  description: 'Smooth flowing organic color transitions',
  supportsMotionReactivity: false,
  uniformMeta: [
    { name: 'u_speed', type: 'float' as const, min: 0, max: 3, default: 0.8, step: 0.1, label: 'Flow Speed' },
    { name: 'u_viscosity', type: 'float' as const, min: 0, max: 2, default: 1.0, step: 0.1, label: 'Viscosity' },
    { name: 'u_complexity', type: 'float' as const, min: 1, max: 8, default: 4, step: 1, label: 'Complexity' },
  ]
};