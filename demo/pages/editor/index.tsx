import Head from 'next/head';
import { Component } from 'react';
import { ThreeSpaceEditor, PlayerProperties, EditorConfig, AssetManager } from 'threespace';
import { SCENES, VisualCarousel } from '../../components/visualCarousel/visualCarousel';
import Utils from '../../lib/utils';

export default class EditorPage extends Component {
  private container: HTMLDivElement | null = null;
  // Prevents React strict-mode's double componentDidMount from creating two editors.
  private editorCreated = false;
  private editor: ThreeSpaceEditor | null = null;

  public static APP_NAME = "ThreeSpace";

  constructor(props: any) {
    super(props);
    AssetManager.AssetBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  }

  componentDidMount() {
    if (!this.container || this.editorCreated) return;
    this.editorCreated = true;
    const container = this.container;
    AssetManager.Fonts = Utils.Fonts;

    const editorConfig: EditorConfig = {
      playerProperties: SCENES[0].properties,
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
