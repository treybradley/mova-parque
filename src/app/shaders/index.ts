// Shader Library - All available GLSL shader presets

import {
  classicGradientShader,
  classicGradientUniforms,
  classicGradientMeta,
} from './classic-gradient.glsl';

import {
  atmosphericHazeShader,
  atmosphericHazeUniforms,
  atmosphericHazeMeta,
} from './atmospheric-haze.glsl';

import {
  liquidGradientShader,
  liquidGradientUniforms,
  liquidGradientMeta,
} from './liquid-gradient.glsl';

import {
  plasmaFlowShader,
  plasmaFlowUniforms,
  plasmaFlowMeta,
} from './plasma-flow.glsl';

import {
  chromaticRippleShader,
  chromaticRippleUniforms,
  chromaticRippleMeta,
} from './chromatic-ripple.glsl';

import {
  blankTemplateShader,
  blankTemplateUniforms,
  blankTemplateMeta,
} from './blank-template.glsl';

import { defaultVertexShader } from './vertex-default.glsl';

// Export default vertex shader for fullscreen rendering
export { defaultVertexShader };

// Uniform metadata type
export interface UniformMetadata {
  name: string;
  type: 'float' | 'color' | 'vec2' | 'vec3';
  min?: number;
  max?: number;
  default?: number | string | number[];
  step?: number;
  label: string;
}

// Shader preset type
export interface ShaderPreset {
  id: string;
  name: string;
  category: 'background' | 'distortion' | 'generative' | 'custom';
  description: string;
  fragmentShader: string;
  uniforms: Record<string, number | number[]>;
  uniformMeta: UniformMetadata[];
  supportsMotionReactivity: boolean;
}

// All shader presets
export const shaderPresets: ShaderPreset[] = [
  {
    ...classicGradientMeta,
    fragmentShader: classicGradientShader,
    uniforms: classicGradientUniforms,
  },
  {
    ...atmosphericHazeMeta,
    fragmentShader: atmosphericHazeShader,
    uniforms: atmosphericHazeUniforms,
  },
  {
    ...liquidGradientMeta,
    fragmentShader: liquidGradientShader,
    uniforms: liquidGradientUniforms,
  },
  {
    ...plasmaFlowMeta,
    fragmentShader: plasmaFlowShader,
    uniforms: plasmaFlowUniforms,
  },
  {
    ...chromaticRippleMeta,
    fragmentShader: chromaticRippleShader,
    uniforms: chromaticRippleUniforms,
  },
  {
    ...blankTemplateMeta,
    fragmentShader: blankTemplateShader,
    uniforms: blankTemplateUniforms,
  },
];

// Helper to get shader by ID
export function getShaderPreset(id: string): ShaderPreset | undefined {
  return shaderPresets.find((shader) => shader.id === id);
}

// Helper to get default shader
export function getDefaultShader(): ShaderPreset {
  return shaderPresets[0]; // Classic Gradient (was Canvas2D)
}