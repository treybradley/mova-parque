// Plasma Flow - Electric vibrant energy patterns
export const plasmaFlowShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Shader parameters
uniform float u_speed; // min:0 max:5 default:2.0 step:0.1
uniform float u_energy; // min:0 max:2 default:1.0 step:0.1
uniform float u_turbulence; // min:0 max:3 default:1.5 step:0.1

// Palette colors
uniform vec3 u_palette0; // color #1a0f2e
uniform vec3 u_palette1; // color #2d1b69
uniform vec3 u_palette2; // color #4a5899
uniform vec3 u_palette3; // color #7b9eb0
uniform vec3 u_palette4; // color #b4d4e1

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 pos = uv * 2.0 - 1.0;
  pos.x *= u_resolution.x / u_resolution.y;
  
  float t = u_time * u_speed * 0.1;
  
  // Create multiple plasma layers
  float plasma1 = sin(pos.x * 3.0 + t) + sin(pos.y * 3.0 + t);
  float plasma2 = sin(length(pos) * 4.0 - t * 2.0);
  float plasma3 = sin((pos.x + pos.y) * 2.0 + t * 1.5);
  
  // Add turbulent distortion
  vec2 turbulence = vec2(
    sin(pos.x * u_turbulence + t) * cos(pos.y * u_turbulence - t),
    cos(pos.x * u_turbulence - t) * sin(pos.y * u_turbulence + t)
  );
  
  float plasma4 = sin(length(pos + turbulence * 0.3) * 5.0 - t * 3.0);
  
  // Combine plasma layers
  float combined = (plasma1 + plasma2 + plasma3 + plasma4) * 0.25;
  combined = combined * 0.5 + 0.5; // Normalize to 0-1
  
  // Use palette colors for vibrant mixing
  vec3 color1Mix = mix(u_palette1, u_palette2, sin(combined * 3.14159 + t) * 0.5 + 0.5);
  vec3 color2Mix = mix(u_palette2, u_palette4, cos(combined * 3.14159 - t * 0.7) * 0.5 + 0.5);
  vec3 finalColor = mix(color1Mix, color2Mix, combined);
  
  // Add energy boost
  finalColor *= u_energy;
  
  // Pulsing glow
  float pulse = sin(t * 2.0) * 0.1 + 0.9;
  finalColor *= pulse;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const plasmaFlowUniforms = {
  u_speed: 2.0,
  u_energy: 1.0,
  u_turbulence: 1.5,
  // Default palette: Deep Sleep
  u_palette0: [0.102, 0.059, 0.180], // #1a0f2e
  u_palette1: [0.176, 0.106, 0.412], // #2d1b69
  u_palette2: [0.290, 0.345, 0.600], // #4a5899
  u_palette3: [0.482, 0.620, 0.690], // #7b9eb0
  u_palette4: [0.706, 0.831, 0.882], // #b4d4e1
};

export const plasmaFlowMeta = {
  id: 'plasma-flow',
  name: 'Plasma Flow',
  category: 'generative' as const,
  description: 'Electric vibrant energy patterns',
  supportsMotionReactivity: false,
  uniformMeta: [
    { name: 'u_speed', type: 'float' as const, min: 0, max: 5, default: 2.0, step: 0.1, label: 'Speed' },
    { name: 'u_energy', type: 'float' as const, min: 0, max: 2, default: 1.0, step: 0.1, label: 'Energy' },
    { name: 'u_turbulence', type: 'float' as const, min: 0, max: 3, default: 1.5, step: 0.1, label: 'Turbulence' },
  ]
};