import Head from 'next/head';
import { Component } from 'react';
import { ThreeSpaceEditor, PlayerProperties, EditorConfig, AssetManager } from 'threespace';
import playerSettingsJSON from '../../public/json/frontPagePlayerSettings.json';
import { VisualCarousel } from '../../components/visualCarousel/visualCarousel';

export default class EditorPage extends Component {
  private container: HTMLDivElement | null = null;
  // Prevents React strict-mode's double componentDidMount from creating two editors.
  private editorCreated = false;
  private editor: ThreeSpaceEditor | null = null;

  public static APP_NAME = "ThreeSpace";

  componentDidMount() {
    if (!this.container || this.editorCreated) return;
    this.editorCreated = true;
    const container = this.container;

    AssetManager.AssetBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    AssetManager.Fonts = [
      { name: 'Open Sans', path: '/fonts/Open_Sans/OpenSans-VariableFont.ttf' },
      { name: 'Noto Sans', path: '/fonts/NotoSans-Regular.ttf' },
      { name: 'Audiowide', path: '/fonts/Audiowide/Audiowide.ttf' },
      { name: 'Amatic SC', path: '/fonts/Amatic_SC/AmaticSC-Regular.ttf' },
      { name: 'Dancing Script', path: '/fonts/Dancing_Script/DancingScript-VariableFont_wght.ttf' },
      { name: 'Indie Flower', path: '/fonts/Indie_Flower/IndieFlower-Regular.ttf' },
      { name: 'Roboto',    path: '/fonts/Roboto/Roboto-Regular.ttf' },
    ];

    const editorConfig: EditorConfig = {
      playerProperties: playerSettingsJSON as PlayerProperties,
    };

    this.editor = new ThreeSpaceEditor(container, editorConfig);
  }

  handleSceneSelected = (path: string, properties: PlayerProperties) => {
    if (this.editor) {
       
      this.editor.PlayerProperties = properties;
    }
  }

  render() {
    return (
      <>
        <Head>
          <title>{`${EditorPage.APP_NAME} Editor`}</title>
          <meta name="description" content="Editor for designing 3D spaces." />
          <link rel="icon" href="/favicon/favicon.ico" />
        </Head>
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
          <div
            ref={(el) => { this.container = el; }}
            style={{ width: '100%', height: '100%' }}
          />
          <VisualCarousel onSceneSelected={this.handleSceneSelected} />
        </div>
      </>
    );
  }
}
