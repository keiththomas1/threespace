import styles from "./visualCarousel.module.css";
import VisualCarouselItem from "./visualCarouselItem";
import Image from 'next/image';
import { useState } from 'react';
import { PlayerProperties } from 'threespace';

import HomeJSON from '../../public/scenes/Home/Home.json';
import HomeThumb from '../../public/scenes/Home/Home.png';
import LabJSON from '../../public/scenes/Lab/Lab.json';
import LabThumb from '../../public/scenes/Lab/Lab.jpg';
import RainyHutJSON from '../../public/scenes/RainyHut/RainyHut.json';
import RainyHutThumb from '../../public/scenes/RainyHut/RainyHut.jpg';
import WinterWarmthJSON from '../../public/scenes/WinterWarmth/WinterWarmth.json';
import WinterWarmthThumb from '../../public/scenes/WinterWarmth/WinterWarmth.jpg';
import UnderwaterJSON from '../../public/scenes/Underwater/Underwater.json';
import UnderwaterThumb from '../../public/scenes/Underwater/Underwater.jpg';
import MoonLanderJSON from '../../public/scenes/MoonLander/MoonLander.json';
import MoonLanderThumb from '../../public/scenes/MoonLander/MoonLander.jpg';

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
    data: { thumbnailURL: HomeThumb.src, path: '/scenes/Home', tooltip: 'Home Page', value: 'Home' },
    properties: HomeJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: LabThumb.src, path: '/scenes/Lab', tooltip: 'Lab', value: 'Lab' },
    properties: LabJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: RainyHutThumb.src, path: '/scenes/RainyHut', tooltip: 'Rainy Hut', value: 'RainyHut' },
    properties: RainyHutJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: WinterWarmthThumb.src, path: '/scenes/WinterWarmth', tooltip: 'Winter Warmth', value: 'WinterWarmth' },
    properties: WinterWarmthJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: UnderwaterThumb.src, path: '/scenes/Underwater', tooltip: 'Underwater', value: 'Underwater' },
    properties: UnderwaterJSON as PlayerProperties,
  },
  {
    data: { thumbnailURL: MoonLanderThumb.src, path: '/scenes/MoonLander', tooltip: 'Moon Lander', value: 'MoonLander' },
    properties: MoonLanderJSON as PlayerProperties,
  },
];

export function VisualCarousel({ onSceneSelected }: { onSceneSelected: (path: string, properties: PlayerProperties) => void }) {
  const [isOpen, setIsOpen] = useState(true);
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

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const previousSrc = `${basePath}/images/48x/Icon_238.png`;
  const nextSrc = `${basePath}/images/48x/Icon_237.png`;

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