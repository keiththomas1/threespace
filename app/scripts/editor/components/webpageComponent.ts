import * as THREE from "three";
import domtoimage from 'dom-to-image';

import { ComponentProperty, PREVIEW_LAYER } from "../utils/constants";
import BaseComponent from "./baseComponent";
import { ComponentType, WebpageProperties } from "../../player/utils/playerDefinitions";

export default class WebpageComponent extends BaseComponent {
  private readonly DISPLAY_NAME = "Name";

  protected playerProperties: WebpageProperties = WebpageComponent.DefaultProperties;

  private textureLoader: THREE.TextureLoader;

  constructor(webpageProperties: WebpageProperties, editorCamera: THREE.Camera) {
    super("WebpageComponent", editorCamera, { hasActions: false, hasCredit: false, hasTransform: true});

    this.componentType = ComponentType.Webpage;
    this.assignProperties(webpageProperties);
    this.setupEditorProperties();

    this.textureLoader = new THREE.TextureLoader();
    //this.textureLoader.crossOrigin = true;
    this.textureLoader.setCrossOrigin('anonymous');
    this.textureLoader.setRequestHeader(
      {
        origin: ""
      }
    );
  }

  public static get DefaultProperties() : WebpageProperties {
    const defaultproperties = this.BaseDefaultProperties as WebpageProperties;
    defaultproperties.componentType = ComponentType.Webpage;
    return defaultproperties;
  }

  public propertyChanged(propertyName: string, property: ComponentProperty) {
    super.propertyChanged(propertyName, property);

    switch (propertyName) {
      case this.DISPLAY_NAME:
        break;
    }
  }

  public createWebpageMesh = (htmlElement: HTMLElement) => {
    const geometry = new THREE.PlaneGeometry( 1, 1 );
    const mesh = new THREE.Mesh( geometry );
    mesh.layers.set(PREVIEW_LAYER);

    // Create HTML to texture image
    domtoimage.toPng(htmlElement).then((value: string) => {
      this.textureLoader.load(value,
        function ( texture ) {
          const material = new THREE.MeshStandardMaterial( { map: texture } );
          if (material.map) material.map.encoding = THREE.sRGBEncoding;
          material.color = new THREE.Color(0xffffff);
          material.transparent = false;
          if (mesh instanceof THREE.Mesh) mesh.material = material;
        }
      );
    });

    this.mesh = mesh;
    this.add(this.mesh);
  }

  protected setupEditorProperties(): void {
    super.setupEditorProperties(() => {
      this.editorProperties[this.DISPLAY_NAME] = { value: "Webpage", type: "String" };
    });
  }
}