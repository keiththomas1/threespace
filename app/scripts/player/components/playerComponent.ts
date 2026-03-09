import * as THREE from "three";
import { Object3D } from "three";
import { ComponentProperties, CreditInfo } from "../utils/playerDefinitions";

export default class PlayerComponent extends THREE.Object3D {
  private componentProperties: ComponentProperties;
  private creditInfo: CreditInfo;

  private onClickCallbacks: (()=>any)[] = [];
  private updateCallback: (deltaTime: number)=>any;

  constructor(object: Object3D, componentProperties: ComponentProperties) {
    super();

    this.componentProperties = componentProperties;
    this.creditInfo = {
      pieceName: "",
      authorName: "",
      websiteName: "",
      licenseName: "",
      locked: false
    };
    this.add(object);
  }

  public get ComponentProperties() {
    return this.componentProperties;
  }

  public get ClickCallbacks() {
    return this.onClickCallbacks;
  }

  public get CreditInfo() {
    return this.creditInfo;
  }
  public set CreditInfo(creditInfo: CreditInfo) {
    this.creditInfo = creditInfo;
  }

  public set UpdateCallback(callback:(deltaTime: number)=>any) {
    this.updateCallback = callback;
  }

  public addClickCallback = (callback:()=>any) => {
    this.onClickCallbacks.push(callback);
  }

  public clicked = () => {
    for (let i = 0; i < this.onClickCallbacks.length; i++) {
      this.onClickCallbacks[i]();
    }
  }

  public update(deltaTime: number) {
    if (this.updateCallback) {
      this.updateCallback(deltaTime);
    }
  }
}