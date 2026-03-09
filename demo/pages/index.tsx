import Head from 'next/head';
import styles from '../styles/Home.module.css'

import Player from '../components/player';
import { VisualCarousel } from '../components/visualCarousel/visualCarousel';

import playerSettingsJSON from '../public/json/frontPagePlayerSettings.json';
import { Component } from 'react';
import { PlayerProperties } from 'threespace';
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

    this.state = { playerSettings: playerSettingsJSON as PlayerProperties };
  }

  playerComponentSelected = (eventName: string) => {
    console.log("Component selected in player with event name: " + eventName);
  }

  handleSceneSelected = (properties: PlayerProperties) => {
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
