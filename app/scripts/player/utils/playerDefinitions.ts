export const SCHEMA_VERSION = 1;
export const PREVIEW_LAYER = 31;

/** Properties of the ThreeSpace player */
export interface PlayerProperties {
  schemaVersion: number, // For versioning of the player settings format.
  sceneProperties: SceneProperties, // General properties of the scene such as background color and type.
  components: ComponentProperties[] // All components in the scene such as cameras, lights, models, etc. with their properties.
}

/** General properties of the scene such as background color and type */
export interface SceneProperties {
  componentType: ComponentType, // Of the "Settings" type (all components need this for properties window).
  backgroundColorType: BackgroundColorType, // Whether the background is a single color or a gradient.
  colorOne: SerializableColor,
  colorTwo: SerializableColor,
}

/**
 * Properties for a component in the scene such as a camera, light, model, etc. Each component has its own specific properties but they all share these common properties.
 */
export interface ComponentProperties {
  componentType: string, // The type of the component such as "Camera", "Light", "Model", etc.
  transformMatrix: number[], // The 4x4 transformation matrix of the component serialized into an array (in column-major order).
  url?: string, // The source URL for components that require an external resource such as models, images, videos, etc.
  filepath?: string, // The original filepath for the component resource, used instead of URL for local files.
  action: ComponentAction, // The action that occurs when the component is interacted with.
  credit: CreditInfo, // The credit information for the component's resource, if applicable. Artist, designer, etc.
}

export interface ComponentTransform {
  position: SerializableVector3,
  rotation: SerializableVector3,
  scale: SerializableVector3
}

export enum ComponentType {
  Camera = "CAMERA",
  Light = "LIGHT",
  Image = "IMAGE",
  Video = "VIDEO",
  Audio = "AUDIO",
  Model = "MODEL",
  Text3D = "TEXT3D",
  Webpage = "WEBPAGE",
  VFX = "VFX",
  Settings = "SETTINGS"
}

export enum BackgroundColorType {
  Single = "SINGLE",
  Gradient = "GRADIENT"
}

export interface SerializableColor {
  r: number,
  g: number,
  b: number
}

export interface SerializableVector3 {
  x: number,
  y: number,
  z: number
}

/* Start Actions */

export enum ActionType {
  HYPERLINK = "hyperlink",
  ZOOM_CAMERA_TO = "zoomCameraTo",
  TRIGGER_EVENT = "triggerEvent",
  NONE = "none"
}

export interface ComponentAction {
  actionType: ActionType,
  hyperlinkURL: string | null,
  zoomCameraMatrix: number[] | null,
  eventName: string | null
}

/* End Actions */

/* Start Light */

export interface LightProperties extends ComponentProperties {
  type: LightType,
  color: SerializableColor,
  intensity: number
}

export enum LightType {
  AMBIENT = "Ambient",
  DIRECTIONAL = "Directional"
}

/* End Light */

/* Start Camera */

export interface CameraProperties extends ComponentProperties {
  transformMatrix: number[],
  type: CameraType,
  fov: number,
  target: SerializableVector3
};

export enum CameraType {
  PERSPECTIVE = "Perspective",
  ORTHOGRAPHIC = "Orthographic"
}

/* End Camera */

/* Start Model */

export interface ModelProperties extends ComponentProperties {
  currentAnimationName: string,
  animationBehaviorType: AnimationBehaviorType
}

export interface ModelInfo {
  object: THREE.Object3D,
  animations: THREE.AnimationClip[]
}

export enum AnimationBehaviorType {
  PLAY_ON_START = "PlayOnStart",
  PLAY_ON_CLICK = "PlayOnClick",
  DONT_PLAY = "DontPlay"
}

export interface CreditInfo {
  pieceName: string,
  authorName: string,
  websiteName: string,
  licenseName: string,
  locked: boolean // Whether the credits are modifiable or not.
}

/* End Model */

/* StartText 3D */

export interface Text3DProperties extends ComponentProperties {
  transformMatrix: number[],
  text: string,
  type: FontType,
  size: number,
  thickness: number,
  height: number,
  frontColor: SerializableColor,
  sideColor: SerializableColor,
}

export enum FontType {
  NOTO_SANS = "Noto Sans",
  AMATIC_SC = "Amatic SC",
  DANCING_SCRIPT = "Dancing Script",
  INDIE_FLOWER = "Indie Flower",
  OPEN_SANS = "Open Sans",
  ROBOTO = "Robotic"
}

export const TEXT3D_FRONT_MAT_NAME = "Text3D_Front_material";
export const TEXT3D_SIDE_MAT_NAME = "Text3D_Side_material";

/* End Text 3D */

/* Start VFX */

export interface VFXProperties extends ComponentProperties {
  type: VFXType,
  textureSrc: string,
  color: SerializableColor,
  speed: number,
  size: number,
  count: number,
  lifetimeMin: number,
  lifetimeMax: number
}

export enum VFXType {
  Basic = "BASIC",
  Snow = "SNOW",
  Dust = "DUST",
  Rain = "RAIN",
  Fish = "FISH"
}

/* End VFX */

/* Start Image */

export interface ImageProperties extends ComponentProperties {
}

/* End Image */

/* Start Video */

export interface VideoProperties extends ComponentProperties {
}

/* End Video */

/* Start Audio */

export interface AudioProperties extends ComponentProperties {
}

/* End Audio */

/* Start Webpage */

export interface WebpageProperties extends ComponentProperties {
}

/* End Webpage */

export const DEFAULT_SCENE_PROPERTIES: SceneProperties = {
  componentType: ComponentType.Settings,
  backgroundColorType: BackgroundColorType.Gradient,
  colorOne: { r: 0, g: 1, b: 1 },
  colorTwo: { r: 0.5, g: 0, b: 0.5 },
};