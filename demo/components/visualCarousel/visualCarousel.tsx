import styles from "./visualCarousel.module.css";
import VisualCarouselItem from "./visualCarouselItem";
import Image from 'next/image';
import { useState } from 'react';
import { AssetManager, PlayerProperties } from 'threespace';

import HomeJSON from '../../public/scenes/Home/Home.json';
import HomeThumb from '../../public/scenes/Home/Home.png';
import LabJSON from '../../public/scenes/Lab/Lab.json';
import LabThumb from '../../public/scenes/Lab/Lab.jpg';
import HexLowPolyJSON from '../../public/scenes/HexLowPoly/HexLowPoly.json';
import HexLowPolyThumb from '../../public/scenes/HexLowPoly/HexLowPoly.jpg';
import EmptyJSON from '../../public/scenes/Empty/Empty.json';
import EmptyThumb from '../../public/scenes/Empty/Empty.jpg';

export interface VisualCarouselData {
  path: string,
  thumbnailURL: string,
  tooltip: string,
  value: string
}

interface SceneEntry {
  data: VisualCarouselData;
  properties: PlayerProperties;
}

export const SCENES: SceneEntry[] = [
  {
    data: { thumbnailURL: EmptyThumb.src, path: '/scenes/Empty', tooltip: 'Empty Scene', value: 'Empty' },
    properties: EmptyJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: HomeThumb.src, path: '/scenes/Home', tooltip: 'Home Page', value: 'Home' },
    properties: HomeJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: LabThumb.src, path: '/scenes/Lab', tooltip: 'Lab', value: 'Lab' },
    properties: LabJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: HexLowPolyThumb.src, path: '/scenes/HexLowPoly', tooltip: 'Hex Low Poly', value: 'HexLowPoly' },
    properties: HexLowPolyJSON as PlayerProperties,
  },
];

export function VisualCarousel({ onSceneSelected, initiallyOpen = true }: { onSceneSelected: (path: string, properties: PlayerProperties) => void, initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleItemSelected(value: string) {
    const scene = SCENES.find(s => s.data.value === value);
    if (scene) onSceneSelected(scene.data.path, scene.properties);
  }

  function navigateLeft() {
    setCurrentIndex((currentIndex - 1 + SCENES.length) % SCENES.length);
  }

  function navigateRight() {
    setCurrentIndex((currentIndex + 1) % SCENES.length);
  }

  if (!isOpen) {
    return (
      <button className={styles.demoScenesButton} onClick={() => setIsOpen(true)}>
        Demo Scenes
      </button>
    );
  }

  const previousSrc = `${AssetManager.AssetBasePath}/images/48x/Icon_238.png`;
  const nextSrc = `${AssetManager.AssetBasePath}/images/48x/Icon_237.png`;

  return (
    <div id={styles.visualCarousel}>
      <Image
        id={styles.visualCarouselLeftButton}
        src={previousSrc} alt="Previous item"
        width={48} height={48}
        onClick={navigateLeft}>
      </Image>
      <div className={styles.imageGallery}>
        <div className={styles.sceneOption}>
          <VisualCarouselItem visualCarouselData={SCENES[currentIndex].data} onSelected={handleItemSelected} />
          <span className={styles.sceneLabel}>{SCENES[currentIndex].data.tooltip}</span>
        </div>
      </div>
      <button>
        <Image
          id={styles.visualCarouselRightButton}
          src={nextSrc} alt="Next item"
          width={48} height={48}
          onClick={navigateRight}>
        </Image>
      </button>
      <button className={styles.exitButton} onClick={() => setIsOpen(false)}>
        ✕
      </button>
    </div>
  );
}