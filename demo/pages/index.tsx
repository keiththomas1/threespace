import Head from 'next/head';
import styles from '../styles/Home.module.css'

import Player from '../components/player';
import { VisualCarousel } from '../components/visualCarousel/visualCarousel';

import { Component } from 'react';
import { PlayerProperties, AssetManager } from 'threespace';
import EditorPage from './editor';

interface State {
  playerSettings: PlayerProperties;
}

export default class HomePage extends Component<{}, State> {
  titleContent: string;
  descriptionContent: string;

  constructor(props: any) {
    super(props);

    this.titleContent = EditorPage.APP_NAME + ", the 3D Editor and Player";
    this.descriptionContent = EditorPage.APP_NAME + " is a 3D editor and player for designing three.js scenes.";

    AssetManager.Fonts = [
      { name: 'Open Sans', path: '/fonts/Open_Sans/OpenSans-VariableFont.ttf' },
      { name: 'Noto Sans', path: '/fonts/NotoSans-Regular.ttf' },
      { name: 'Audiowide', path: '/fonts/Audiowide/Audiowide.ttf' },
      { name: 'Amatic SC', path: '/fonts/Amatic_SC/AmaticSC-Regular.ttf' },
      { name: 'Dancing Script', path: '/fonts/Dancing_Script/DancingScript-VariableFont_wght.ttf' },
      { name: 'Indie Flower', path: '/fonts/Indie_Flower/IndieFlower-Regular.ttf' },
      { name: 'Roboto',    path: '/fonts/Roboto/Roboto-Regular.ttf' },
    ];

    this.state = { playerSettings: null };
  }

  playerComponentSelected = (eventName: string) => {
    console.log("Component selected in player with event name: " + eventName);
  }

  handleSceneSelected = (path: string, properties: PlayerProperties) => {
    this.setState({ playerSettings: properties });
  }

  render() {
    return (
      <div className={styles.container}>
        <Head>
          <title>{this.titleContent}</title>
          <meta name="description" content={this.descriptionContent} />
          <link rel="icon" href="/favicon/favicon.ico" />
        </Head>

        <main id={styles.main}>
          <div id={styles.canvasParent} style={{ position: 'relative' }}>
            <Player
              playerSettings={this.state.playerSettings}
              playerComponentSelected={this.playerComponentSelected}
            />
            <VisualCarousel onSceneSelected={this.handleSceneSelected} />
          </div>
        </main>
      </div>
    )
  }
}
