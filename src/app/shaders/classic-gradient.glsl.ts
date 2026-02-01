// Classic Gradient - Faithful port of the original Canvas2D animated gradient
// Replicates the atmospheric radial gradient with palette-based colors

export const classicGradientShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Universal background parameters
uniform float u_brightness; // min:0.3 max:1.8 default:0.6 step:0.05
uniform float u_haziness; // min:0 max:1 default:0.8 step:0.05
uniform float u_depth; // min:0.81 max:2.99 default:1.5 step:0.01

// Palette colors (injected from current mood palette)
uniform vec3 u_palette0; // color #1a0f2e
uniform vec3 u_palette1; // color #2d1b69
uniform vec3 u_palette2; // color #4a5899
uniform vec3 u_palette3; // color #7b9eb0
uniform vec3 u_palette4; // color #b4d4e1

// Get palette color by index with smooth interpolation
vec3 getPaletteColor(float index) {
  index = clamp(index, 0.0, 4.0);
  
  if (index < 1.0) return mix(u_palette0, u_palette1, fract(index));
  if (index < 2.0) return mix(u_palette1, u_palette2, fract(index));
  if (index < 3.0) return mix(u_palette2, u_palette3, fract(index));
  if (index < 4.0) return mix(u_palette3, u_palette4, fract(index));
  return u_palette4;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  // Correct for aspect ratio to ensure circular gradient
  float aspectRatio = u_resolution.x / u_resolution.y;
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= aspectRatio;
  
  vec2 center = vec2(0.0, 0.0); // Center in adjusted space
  
  // Brightness factor: maps brightness slider to palette color selection
  // Low brightness = darker colors (indices 0-2), High brightness = brighter colors (2-4)
  float brightnessFactor = (u_brightness - 0.3) / (1.8 - 0.3); // 0 to 1
  float brightnessShift = (brightnessFactor - 0.5) * 2.0; // -1 to 1
  
  // Distance from center
  float dist = length(centeredUv);
  
  // Create radial gradient using palette colors
  // Map distance to color stops (replicating Canvas2D gradient.addColorStop)
  float gradientValue = dist / (u_depth * 0.7); // depth controls gradient size
  
  // Select colors based on brightness shift
  float c0 = clamp(1.0 + brightnessShift, 0.0, 4.0);
  float c1 = clamp(2.0 + brightnessShift, 0.0, 4.0);
  float c2 = clamp(3.0 + brightnessShift, 0.0, 4.0);
  float c3 = clamp(0.0 + brightnessShift, 0.0, 4.0);
  
  vec3 color;
  if (gradientValue < 0.3) {
    // Inner gradient: palette[c0] to palette[c1]
    color = mix(
      getPaletteColor(c0),
      getPaletteColor(c1),
      gradientValue / 0.3
    );
  } else if (gradientValue < 0.6) {
    // Mid gradient: palette[c1] to palette[c2]
    color = mix(
      getPaletteColor(c1),
      getPaletteColor(c2),
      (gradientValue - 0.3) / 0.3
    );
  } else {
    // Outer gradient: palette[c2] to palette[c3]
    color = mix(
      getPaletteColor(c2),
      getPaletteColor(c3),
      min((gradientValue - 0.6) / 0.4, 1.0)
    );
  }
  
  // Apply haze overlay (fog/wash effect)
  if (u_haziness > 0.1) {
    float hazeAlpha = u_haziness * 0.15;
    
    // Vertical haze gradient
    vec3 hazeColor1 = getPaletteColor(clamp(4.0 + brightnessShift, 0.0, 4.0));
    vec3 hazeColor2 = getPaletteColor(clamp(3.0 + brightnessShift, 0.0, 4.0));
    
    vec3 hazeGradient = mix(hazeColor1, hazeColor2, uv.y);
    hazeGradient = mix(hazeGradient, hazeColor1, abs(uv.y - 0.5) * 2.0);
    
    // Blend haze with base color
    color = mix(color, hazeGradient, hazeAlpha);
  }
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const classicGradientUniforms = {
  u_brightness: 0.6,
  u_haziness: 0.8,
  u_depth: 0.7,
  // Default palette: Deep Sleep
  u_palette0: [0.102, 0.059, 0.180], // #1a0f2e
  u_palette1: [0.176, 0.106, 0.412], // #2d1b69
  u_palette2: [0.290, 0.345, 0.600], // #4a5899
  u_palette3: [0.482, 0.620, 0.690], // #7b9eb0
  u_palette4: [0.706, 0.831, 0.882], // #b4d4e1
};

export const classicGradientMeta = {
  id: 'classic-gradient',
  name: 'Classic Gradient',
  category: 'background' as const,
  description: 'Atmospheric radial gradient - the original Canvas2D effect',
  supportsMotionReactivity: true,
  uniformMeta: [
    { name: 'u_brightness', type: 'float' as const, min: 0.3, max: 1.8, default: 0.6, step: 0.05, label: 'Brightness' },
    { name: 'u_haziness', type: 'float' as const, min: 0, max: 1, default: 0.8, step: 0.05, label: 'Haziness' },
    { name: 'u_depth', type: 'float' as const, min: 0.81, max: 2.99, default: 1.5, step: 0.01, label: 'Depth' },
  ]
};