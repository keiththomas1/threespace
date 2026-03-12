import * as THREE from "three";
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js'

import psrdnoise from '../glsl/psrdnoise3.glsl'
import mat3LookAt from '../glsl/mat3-lookat.glsl'
import mat4Compose from '../glsl/mat4-compose.glsl'
import VFXBaseObject from "./vfxBaseObject";
import { AssetManager } from "../..";

const { randFloat: rnd, randFloatSpread: rndFS } = THREE.MathUtils;

class ColorScale {
  private range = [];
  private dummy = new THREE.Color();
  private colors;

  constructor(colors) {
    this.setColors(colors)
    this.colors = colors;
  }

  public setColors (colors) {
    this.range = []
    colors.forEach(color => {
      this.range.push(new THREE.Color(color))
    })
  }

  public getColorAt (progress) {
    const p = Math.max(0, Math.min(1, progress)) * (this.colors.length - 1)
    const i1 = Math.floor(p)
    const c1 = this.range[i1]
    if (i1 >= this.colors.length - 1) {
      return c1.clone()
    }
    const p1 = p - i1
    const c2 = this.range[i1 + 1]

    this.dummy.r = c1.r + p1 * (c2.r - c1.r)
    this.dummy.g = c1.g + p1 * (c2.g - c1.g)
    this.dummy.b = c1.b + p1 * (c2.b - c1.b)
    return this.dummy.clone()
  }
}

export default class VFXFishObject extends VFXBaseObject {
  private WIDTH;
  private COUNT;

  private gpu;
  private dtPosition;
  private dtVelocity;
  private velocityVariable;
  private positionVariable;

  private uTexturePosition = { value: null };
  private uOldTexturePosition = { value: null };
  private uTextureVelocity = { value: null };
  private uTime = { value: 0 };
  private uNoiseCoordScale;
  private uNoiseIntensity;
  private uMaxVelocity;
  private uAttractionRadius1;
  private uAttractionRadius2;
  private uFishScale;
  private uFishSpeed;
  private uFishDisplacementScale;

  private gpuTexturesUniforms;
  private commonUniforms;
  private uniforms;

  private geometry;
  private material;
  private iMesh;
  private config;
  private clock = new THREE.Clock();

  constructor(config: any, renderer: THREE.WebGLRenderer) {
    super();

    config = {
      gpgpuSize: 8,
      fogDensity: 0.025,
      texture: `${AssetManager.AssetBasePath}/images/fishes.png`,
      textureCount: 8,
      material: 'phong',
      materialParams: {
        transparent: true,
        alphaTest: 0.5
      },
      fishScale: [1, 1, 1],
      fishWidthSegments: 8,
      fishSpeed: 1.5,
      noiseCoordScale: 0.01,
      noiseTimeCoef: 0.0005,
      noiseIntensity: 0.00006,
      attractionRadius1: 50,
      attractionRadius2: 100,
      maxVelocity: 0.1
    };


    this.WIDTH = config.gpgpuSize;
    this.COUNT = this.WIDTH * this.WIDTH;

    this.uNoiseCoordScale = { value: config.noiseCoordScale };
    this.uNoiseIntensity = { value: config.noiseIntensity };
    this.uMaxVelocity = { value: config.maxVelocity };
    this.uAttractionRadius1 = { value: config.attractionRadius1 };
    this.uAttractionRadius2 = { value: config.attractionRadius2 };
    this.uFishScale = { value: new THREE.Vector3(...config.fishScale) };
    this.uFishSpeed = { value: config.fishSpeed };
    this.uFishDisplacementScale = { value: config.fishDisplacementScale };

    this.gpuTexturesUniforms = {
      uTexturePosition: this.uTexturePosition,
      uOldTexturePosition: this.uOldTexturePosition,
      uTextureVelocity: this.uTextureVelocity };
    this.commonUniforms = {
      uTime: this.uTime,
      uNoiseCoordScale: this.uNoiseCoordScale,
      uNoiseIntensity: this.uNoiseIntensity,
      uMaxVelocity: this.uMaxVelocity,
      uAttractionRadius1: this.uAttractionRadius1,
      uAttractionRadius2: this.uAttractionRadius2,
      uFishScale: this.uFishScale,
      uFishSpeed: this.uFishSpeed,
      uFishDisplacementScale: this.uFishDisplacementScale }
    this.uniforms = { ...this.gpuTexturesUniforms, ...this.commonUniforms };

    this.config = config;
    this.InitGPU(renderer);
    this.InitScene();
  }

  public Update(deltaTime: number) {
    this.uTime.value = this.clock.getElapsedTime() * 3 * this.config.noiseTimeCoef;

    this.gpu.compute()
    this.uTexturePosition.value = this.positionVariable.renderTargets[this.gpu.currentTextureIndex].texture;
    this.uOldTexturePosition.value = this.positionVariable.renderTargets[this.gpu.currentTextureIndex === 0 ? 1 : 0].texture;
    this.uTextureVelocity.value = this.velocityVariable.renderTargets[this.gpu.currentTextureIndex].texture;
  }

  private InitGPU(renderer) {
    this.gpu = new GPUComputationRenderer(this.WIDTH, this.WIDTH, renderer)
    if (!renderer.capabilities.isWebGL2) {
      this.gpu.setDataType(THREE.HalfFloatType)
    }

    this.dtPosition = this.gpu.createTexture()
    this.dtVelocity = this.gpu.createTexture()
    this.InitTextures(this.dtPosition, this.dtVelocity)

    this.velocityVariable = this.gpu.addVariable('textureVelocity', `
      ${psrdnoise}
      uniform float uTime;
      uniform float uNoiseCoordScale;
      uniform float uNoiseIntensity;
      uniform float uMaxVelocity;
      uniform float uAttractionRadius1;
      uniform float uAttractionRadius2;
      uniform float uFishSpeed;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);

        vec3 grad;
        float n = psrdnoise(pos.xyz * uNoiseCoordScale, vec3(0), uTime, grad);
        grad = grad * uNoiseIntensity;
        vel.xyz = vel.xyz + (pos.w * 0.75) * grad;

        vec3 dv = -pos.xyz;
        float coef = smoothstep(uAttractionRadius1, uAttractionRadius2, length(dv));
        vel.xyz = vel.xyz + pos.w * coef * normalize(dv);
        vel.xyz = clamp(vel.xyz, -uMaxVelocity, uMaxVelocity);

        vel.w = mod(vel.w + length(vel.xyz) * (0.5 + pos.w) * uFishSpeed, 6.2831853071);
        gl_FragColor = vel;
      }
    `, this.dtVelocity)

    this.positionVariable = this.gpu.addVariable('texturePosition', `
      ${psrdnoise}
      uniform float uTime;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec4 pos = texture2D(texturePosition, uv);
        vec4 vel = texture2D(textureVelocity, uv);
        pos.xyz += vel.xyz;
        gl_FragColor = pos;
      }
    `, this.dtPosition)

    this.gpu.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable])
    this.gpu.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable])

    Object.keys(this.commonUniforms).forEach(key => {
      this.velocityVariable.material.uniforms[key] = this.uniforms[key]
      this.positionVariable.material.uniforms[key] = this.uniforms[key]
    })

    const error = this.gpu.init()
    if (error !== null) {
      throw new Error(error)
    }
  }

  private InitScene() {
    this.geometry = new THREE.PlaneGeometry(2, 1, this.config.fishWidthSegments, 1).rotateY(Math.PI / 2)

    const gpuUvs = new Float32Array(this.COUNT * 2)
    const mapIndexes = new Float32Array(this.COUNT)
    let i1 = 0
    let i2 = 0
    for (let j = 0; j < this.WIDTH; j++) {
      for (let i = 0; i < this.WIDTH; i++) {
        gpuUvs[i1++] = i / (this.WIDTH - 1)
        gpuUvs[i1++] = j / (this.WIDTH - 1)
        mapIndexes[i2++] = Math.floor(Math.random() * this.config.textureCount)
      }
    }
    this.geometry.setAttribute('gpuUv', new THREE.InstancedBufferAttribute(gpuUvs, 2))
    this.geometry.setAttribute('mapIndex', new THREE.InstancedBufferAttribute(mapIndexes, 1))

    const materialParams = { side: THREE.DoubleSide, ...this.config.materialParams }
    if (this.config.texture) {
      materialParams.map = new THREE.TextureLoader().load(this.config.texture)
    }

    materialParams.onBeforeCompile = shader => {
      shader.defines = {
        COMPUTE_NORMALS: this.config.material !== 'basic',
        FISH_DZ: (2.0 / this.config.fishWidthSegments).toFixed(10),
        TEXTURE_COUNT: this.config.textureCount.toFixed(10)
      }
      Object.keys(this.uniforms).forEach(key => {
        shader.uniforms[key] = this.uniforms[key]
      })
      shader.vertexShader = `
        uniform sampler2D uTexturePosition;
        uniform sampler2D uOldTexturePosition;
        uniform sampler2D uTextureVelocity;
        uniform vec3 uFishScale;
        uniform float uFishDisplacementScale;
        attribute vec2 gpuUv;
        attribute float mapIndex;
        varying vec4 vPos;
        varying vec4 vVel;
        varying float vMapIndex;
        ${mat3LookAt}
        ${mat4Compose}
      ` + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <normal_vertex>', '')
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        vPos = texture2D(uTexturePosition, gpuUv);
        vec4 oldPos = texture2D(uOldTexturePosition, gpuUv);
        vVel = texture2D(uTextureVelocity, gpuUv);
        vMapIndex = float(mapIndex);

        mat3 rmat = lookAt(oldPos.xyz, vPos.xyz, vec3(0, 1, 0));
        mat4 im = compose(vPos.xyz, rmat, (0.5 + vPos.w) * uFishScale);

        vec3 transformed = vec3(position);

        #ifdef COMPUTE_NORMALS
          vec3 transformedNormal = objectNormal;
        #endif

        float dz = transformed.z + 1.0;
        float sdz = smoothstep(2.0, 0.0, dz);
        transformed.x += sin(vVel.w + dz * PI * 1.5) * sdz * uFishDisplacementScale;

        #ifdef COMPUTE_NORMALS
          float dz1 = dz - 0.2;
          float sdz1 = smoothstep(2.0, 0.0, dz1);
          float dx1 = sin(vVel.w + dz1 * PI * 1.5) * sdz1 * uFishDisplacementScale - transformed.x;
          vec3 v1 = vec3(dx1, 0.0, -FISH_DZ);
          vec3 v2 = vec3(0.0, 1.0, 0.0);
          transformedNormal = normalize(cross(v1, v2));
        #endif

        #ifdef COMPUTE_NORMALS
          #ifdef USE_INSTANCING
            mat3 m = mat3( im );
            transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
            transformedNormal = m * transformedNormal;
          #endif
          transformedNormal = normalMatrix * transformedNormal;
          #ifdef FLIP_SIDED
            transformedNormal = - transformedNormal;
          #endif
          #ifdef USE_TANGENT
            vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
            #ifdef FLIP_SIDED
              transformedTangent = - transformedTangent;
            #endif
          #endif
          #ifndef FLAT_SHADED
            vNormal = normalize( transformedNormal );
            #ifdef USE_TANGENT
              vTangent = normalize( transformedTangent );
              vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
            #endif
          #endif
        #endif
      `)

      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = im * mvPosition;
        #endif
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `)

      shader.fragmentShader = `
        varying float vMapIndex;
      ` + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 uv = vUv;
          uv.x = (vMapIndex + vUv.x) / TEXTURE_COUNT;
          vec4 sampledDiffuseColor = texture2D(map, uv);
          diffuseColor *= sampledDiffuseColor;
        #endif
      `)
    }

    switch (this.config.material) {
      case 'standard' :
        this.material = new THREE.MeshStandardMaterial(materialParams);
        break
      case 'phong' :
        this.material = new THREE.MeshPhongMaterial(materialParams);
        break
      default :
        this.material = new THREE.MeshBasicMaterial(materialParams);
        break;
    }

    this.iMesh = new THREE.InstancedMesh(this.geometry, this.material, this.COUNT);
    this.SetColors(this.config.colors);

    this.add(this.iMesh);
  }

  private SetColors(colors) {
    if (Array.isArray(colors) && colors.length > 1) {
      const cscale = new ColorScale(colors)
      for (let i = 0; i < this.COUNT; i++) {
        this.iMesh.setColorAt(i, cscale.getColorAt(i / this.COUNT))
      }
      this.iMesh.instanceColor.needsUpdate = true
    }
  }

   private InitTextures(texturePosition, textureVelocity) {
    const dummy = new THREE.Vector3()
    const posArray = texturePosition.image.data;
    const velArray = textureVelocity.image.data;
    for (let k = 0, kl = posArray.length; k < kl; k += 4) {
      dummy.set(rndFS(1), rndFS(1), rndFS(1)).normalize()
        .multiplyScalar(rndFS(this.config.attractionRadius1 * 2)).toArray(posArray, k);
      posArray[k + 3] = rnd(0.1, 1);

      dummy.set(rndFS(1), rndFS(1), rndFS(1)).normalize().multiplyScalar(rndFS(0.5)).toArray(velArray, k);
      velArray[k + 3] = 0;
    }
  }
}