import * as THREE from "three";
import { SerializableVector3, VFXProperties } from "../utils/playerDefinitions";
import { VFXData } from "../utils/vfxInfo";
import VFXBaseObject from "./vfxBaseObject";

export interface ParticleInfo {
  time: number,
  speed: number,
  lifetime: number,
  velocity: SerializableVector3,
  x: number,
  y: number,
  z: number
}

export class VFXObject extends VFXBaseObject {
  private readonly DELTA_TIME_THRESHOLD = 2;

  protected vfxMesh: THREE.InstancedMesh;
  protected particles: ParticleInfo[];

  protected tempTranslation: THREE.Vector3 = new THREE.Vector3();
  protected tempScale: THREE.Vector3 = new THREE.Vector3();
  protected tempEuler: THREE.Euler = new THREE.Euler();
  private tempQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private tempMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

  private vfxProperties: VFXProperties;
  private vfxData: VFXData;

  private material: THREE.MeshBasicMaterial;
  private currentSize: number;
  private currentSpeed: number;

  constructor(vfxProperties: VFXProperties, vfxData: VFXData) {
    super();
    this.vfxProperties = vfxProperties;
    this.vfxData = vfxData;

    const geometry = new THREE.DodecahedronGeometry(0.2, 0);
    this.material = new THREE.MeshBasicMaterial(
      { color: new THREE.Color(vfxProperties.color.r, vfxProperties.color.g, vfxProperties.color.b) });

    this.particles = this.GetParticleValues(vfxProperties, vfxData);
    this.vfxMesh = new THREE.InstancedMesh(geometry, this.material, vfxProperties.count);
    this.add(this.vfxMesh);

    this.currentSpeed = vfxProperties.speed;
    this.currentSize = vfxProperties.size;
  }

  public set Color(color: THREE.Color) {
    this.material.color = color;
  }
  public set CurrentSpeed(speed: number) {
    this.currentSpeed = speed;
  }
  public set CurrentSize(size: number) {
    this.currentSize = size;
  }
  public set CurrentCount(count: number) {
    this.remove(this.vfxMesh);
    this.vfxMesh = new THREE.InstancedMesh(this.vfxMesh.geometry, this.vfxMesh.material, count);
    this.add(this.vfxMesh);

    this.particles = this.GetParticleValues(this.vfxProperties, this.vfxData);
  }
  public set CurrentLifetimeMin(min: number) {
    this.vfxProperties.lifetimeMin = min;
    this.particles = this.GetParticleValues(this.vfxProperties, this.vfxData);
  }
  public set CurrentLifetimeMax(max: number) {
    this.vfxProperties.lifetimeMax = max;
    this.particles = this.GetParticleValues(this.vfxProperties, this.vfxData);
  }

  public Update(deltaTime: number) {
    if (deltaTime > this.DELTA_TIME_THRESHOLD) {
      return;
    }

    this.particles.forEach((particle, index) => {
      particle.time += deltaTime;

      if (particle.time > particle.lifetime) {
        particle.time = 0;
      }

      this.SetParticleTranslation(particle);
      this.SetParticleEulerRotation(particle);
      this.SetParticleScale(particle);
      this.tempQuaternion.setFromEuler(this.tempEuler, false);

      this.tempMatrix.identity();
      this.tempMatrix.compose(
        this.tempTranslation,
        this.tempQuaternion,
        this.tempScale
      );

      // And apply the matrix to the instanced item
      this.vfxMesh.setMatrixAt(index, this.tempMatrix);
    });

    this.vfxMesh.instanceMatrix.needsUpdate = true;
  }

  private GetParticleValues(vfxProperties: VFXProperties, vfxData: VFXData) {
    const particles: ParticleInfo[] = [];
    for (let i = 0; i < vfxProperties.count; i++) {
      const speed = this.GetRandomSpeedValue();
      const lifetime = this.GetRandomLifetimeValue(vfxProperties);
      const time = this.GetRandomTimeValue(lifetime, vfxData);
      const velocity = vfxData.randomizeDirection ?
        { x: Math.random(), y: Math.random(), z: Math.random() } :
        vfxData.velocity;

      const x = this.GetRandomXValue();
      const y = this.GetRandomYValue();
      const z = this.GetRandomZValue();

      particles.push({ time, speed, lifetime, velocity, x, y, z });
    }
    return particles;
  }

  protected GetRandomTimeValue(lifetime: number, vfxData: VFXData) {
    if (vfxData.randomizeTimeOnStart) {
      return Math.random() * lifetime;
    } else {
      return 0;
    }
  }
  protected GetRandomSpeedValue() {
    return ((Math.random() * 0.5) + 1) / 100 / 2;
  }
  protected GetRandomXValue() {
    return this.vfxData.xMin + (Math.random() * (this.vfxData.xMax - this.vfxData.xMin));
  }
  protected GetRandomYValue() {
    return this.vfxData.yMin + (Math.random() * (this.vfxData.yMax - this.vfxData.yMin));
  }
  protected GetRandomZValue() {
    return this.vfxData.zMin + (Math.random() * (this.vfxData.zMax - this.vfxData.zMin));
  }
  protected GetRandomLifetimeValue(vfxProperties: VFXProperties) {
    return (Math.random() * (vfxProperties.lifetimeMax - vfxProperties.lifetimeMin)) + vfxProperties.lifetimeMin;
  }

  protected SetParticleTranslation(info: ParticleInfo) {
    let { time, x, y, z } = info;

    x += (info.velocity.x * this.currentSpeed * time);
    x += (Math.cos(time) * this.vfxData.angularVelocity.x * time);

    y += (info.velocity.y * this.currentSpeed * time);
    y += (Math.cos(time) * this.vfxData.angularVelocity.y * time);

    z += (info.velocity.z * this.currentSpeed * time);
    z += (Math.cos(time) * this.vfxData.angularVelocity.z * time);

    this.tempTranslation.set(x, y, z);
  }

  protected SetParticleScale(info: ParticleInfo) {
    const s = Math.sin(info.time / 2) * this.currentSize;
    this.tempScale.set(s, s, s);
  }

  protected SetParticleEulerRotation(info: ParticleInfo) {
    const s = Math.sin(info.time);
    this.tempEuler.set(s * 5, s * 5, s * 5);
  }
}