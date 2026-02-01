// Blank Template - Starting point for custom shaders
export const blankTemplateShader = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

// Add your custom uniforms here
// uniform float u_myParameter; // min:0 max:1 default:0.5 step:0.01

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  // Your shader code here
  vec3 color = vec3(uv.x, uv.y, 0.5);
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const blankTemplateUniforms = {
  // Add your default uniform values here
};

export const blankTemplateMeta = {
  id: 'blank-template',
  name: 'Blank Template',
  category: 'custom' as const,
  description: 'Starting point for custom shader development',
  supportsMotionReactivity: false,
  uniformMeta: []
};