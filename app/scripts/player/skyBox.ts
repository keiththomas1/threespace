import * as THREE from "three";

export default class SkyBox {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
    geometry.computeBoundingBox();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color1: {
          value: new THREE.Color("red")
        },
        color2: {
          value: new THREE.Color("purple")
        },
        bboxMin: {
          value: geometry.boundingBox ? geometry.boundingBox.min : new THREE.Vector3(0, 0, 0)
        },
        bboxMax: {
          value: geometry.boundingBox ? geometry.boundingBox.max : new THREE.Vector3(0, 0, 0)
        }
      },
      vertexShader: `
        uniform vec3 bboxMin;
        uniform vec3 bboxMax;

        varying vec2 vUv;

        void main() {
          vUv.y = (position.y - bboxMin.y) / (bboxMax.y - bboxMin.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;

        varying vec2 vUv;

        void main() {

          gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
        }
      `,
      // wireframe: true
    });
    this.material.side = THREE.BackSide;

    this.mesh = new THREE.Mesh(geometry, this.material);
    scene.add(this.mesh);
  }

  public set Enabled(enabled: boolean) {
    this.mesh.visible = enabled;
  }

  public set ColorOne(color: THREE.Color) {
    this.material.uniforms.color1.value = color;
  }

  public set ColorTwo(color: THREE.Color) {
    this.material.uniforms.color2.value = color;
  }
}