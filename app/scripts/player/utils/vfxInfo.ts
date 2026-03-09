import { SerializableVector3 } from "./playerDefinitions";

export interface VFXData {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  velocity: SerializableVector3;
  angularVelocity: SerializableVector3;
  randomizeDirection: boolean;
  randomizeTimeOnStart: boolean;
}

const ROOM_SIZE = 30;

export const BasicVfxData: VFXData = {
  xMin: -ROOM_SIZE/2,
  xMax: ROOM_SIZE/2,
  yMin: -ROOM_SIZE/2,
  yMax: ROOM_SIZE/2,
  zMin: -ROOM_SIZE/2,
  zMax: ROOM_SIZE/2,
  velocity: {x: 10, y: 10, z: 10},
  angularVelocity: {x: 0, y: 0, z: 0},
  randomizeDirection: false,
  randomizeTimeOnStart: true
};

export const DustVfxData: VFXData = {
  xMin: -ROOM_SIZE/2,
  xMax: ROOM_SIZE/2,
  yMin: -ROOM_SIZE/2,
  yMax: ROOM_SIZE/2,
  zMin: -ROOM_SIZE/2,
  zMax: ROOM_SIZE/2,
  velocity: {x: 0, y: 0, z: 0},
  angularVelocity: {x: 0, y: 0, z: 0},
  randomizeDirection: true,
  randomizeTimeOnStart: true
};

export const SnowVfxData: VFXData = {
  xMin: -ROOM_SIZE/2,
  xMax: ROOM_SIZE/2,
  yMin: ROOM_SIZE * 3 / 4,
  yMax: ROOM_SIZE * 3 / 4,
  zMin: -ROOM_SIZE/2,
  zMax: ROOM_SIZE/2,
  velocity: {x: 0, y: -3, z: 0},
  angularVelocity: {x: 0, y: 0, z: 0},
  randomizeDirection: false,
  randomizeTimeOnStart: true
};

export const RainVfxData: VFXData = {
  xMin: -ROOM_SIZE/2,
  xMax: ROOM_SIZE/2,
  yMin: ROOM_SIZE * 3 / 4,
  yMax: ROOM_SIZE * 3 / 4,
  zMin: -ROOM_SIZE/2,
  zMax: ROOM_SIZE/2,
  velocity: {x: 0, y: -10, z: 0},
  angularVelocity: {x: 0, y: 0, z: 0},
  randomizeDirection: false,
  randomizeTimeOnStart: true
};