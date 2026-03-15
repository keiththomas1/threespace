import * as THREE from "three";
import { ActionType, ComponentAction } from "../../player/utils/playerDefinitions";

export const APP_NAME: string = "ThreeSpace";
export const DEFAULT_BACKGROUND_COLOR: THREE.Color
  = new THREE.Color(30/255, 30/255, 30/255);
export const DEFAULT_MATRIX_ARRAY: number[]
  = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
export const DEFAULT_ACTION: ComponentAction = {
  actionType: ActionType.NONE,
  hyperlinkURL: "",
  zoomCameraMatrix: [],
  eventName: ""
};

export interface ComponentProperty {
  value: any;
  type: string;
  enumType?: any;
  min?: number;
  max?: number;
  step?: number;
}
export interface TransformProperty {
  position: ComponentProperty,
  rotation: ComponentProperty,
  scale: ComponentProperty,
}
export interface ActionProperty {
  actionType: ComponentProperty,
  hyperlinkURL: ComponentProperty,
  zoomCameraMatrix: ComponentProperty,
  eventName: ComponentProperty
}
export interface CreditProperty {
  pieceName: ComponentProperty,
  authorName: ComponentProperty,
  websiteName: ComponentProperty,
  licenseName: ComponentProperty,
  locked: ComponentProperty
}

export enum UrlPathType {
  InternetURL = "Internet URL",
  RelativeServerPath = "Relative Server Path"
}

export interface UrlProperty {
  pathType: ComponentProperty,
  path: ComponentProperty,
}