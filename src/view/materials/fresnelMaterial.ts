import * as THREE from 'three';

export interface FresnelOptions {
  color: number;
  power?: number;
  intensity?: number;
}

/**
 * Adds a view-dependent Fresnel rim highlight onto MeshStandardMaterial / MeshPhysicalMaterial
 * via onBeforeCompile so shadows, normal maps, sheen, and IBL stay intact.
 */
export function applyFresnelRim<T extends THREE.MeshStandardMaterial>(
  material: T,
  options: FresnelOptions,
): T {
  const rimColor = new THREE.Color(options.color);
  const power = options.power ?? 2.8;
  const intensity = options.intensity ?? 0.65;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = {value: rimColor};
    shader.uniforms.uRimPower = {value: power};
    shader.uniforms.uRimIntensity = {value: intensity};

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uRimIntensity;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `vec3 rimNormal = normalize(vNormal);
        vec3 rimView = normalize(vViewPosition);
        float rimFactor = pow(1.0 - clamp(abs(dot(rimNormal, rimView)), 0.0, 1.0), uRimPower);
        gl_FragColor.rgb += uRimColor * (rimFactor * uRimIntensity);
        #include <dithering_fragment>`,
      );
  };
  material.customProgramCacheKey = () => 'fresnel_rim_v1';
  return material;
}
