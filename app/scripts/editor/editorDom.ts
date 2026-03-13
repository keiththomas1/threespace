/**
 * editorDom.ts
 * Builds the full editor DOM programmatically inside a provided container element.
 * Returns references to the elements ThreeSpaceEditor and UiController need directly.
 * All other elements can be queried by the IDs defined in editorIds.ts.
 */

import { EditorIds, EditorClasses } from './editorIds';
import editorCss from './editor.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolbarButtonConfig {
  id: string;
  label: string;
  tooltipText?: string;
  /** If provided, the main button calls this directly — no popout shown. */
  onClicked?: () => void;
  fileUploadTypes?: string;
  onFileUploaded?: (files: File[]) => void;
  onUrlSelected?: (url: string) => void;
}

export interface EditorDomRefs {
  editorParent: HTMLElement;
  canvasParent: HTMLElement;
}

export interface EditorToolbarCallbacks {
  onAddText?: () => void;
  onUploadImage?: (files: File[]) => void;
  onImportImageByUrl?: (url: string) => void;
  onUploadVideo?: (files: File[]) => void;
  onImportVideoByUrl?: (url: string) => void;
  onUploadModel?: (files: File[]) => void;
  onImportModelByUrl?: (url: string) => void;
  onAddLight?: () => void;
  onUploadAudio?: (files: File[]) => void;
  onShowVFX?: () => void;
  onSceneSettings?: () => void;
}

// ---------------------------------------------------------------------------
// CSS injection
// ---------------------------------------------------------------------------

let cssInjected = false;

function injectStyles() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;

  const style = document.createElement('style');
  style.textContent = editorCss;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Toolbar button factory
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<Record<string, string>> = {},
  classes: string[] = []
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => { if (v !== undefined) (elem as any)[k] = v; });
  if (classes.length) elem.className = classes.join(' ');
  return elem;
}

// Builds a centred full-viewport text-input overlay and attaches a trigger
// button to the given popout. Reused for both "URL" and "Local path" inputs.
function attachTextInputPopup(
  popout: HTMLElement,
  wrapper: HTMLElement,
  opts: {
    id: string;
    btnLabel: string;
    title: string;
    inputLabel: string;
    placeholder?: string;
    submitLabel: string;
    onSubmit: (value: string) => void;
  }
): void {
  const triggerBtn = el('button', { type: 'button' }, ['ts-toolbar-popout-btn', EditorClasses.tooltipButton]);
  triggerBtn.textContent = opts.btnLabel;

  const overlay = el('div', { id: opts.id + '-overlay' }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  overlay.style.position = 'fixed'; // cover the full viewport, not just the toolbar

  const modal = el('div', {}, [EditorClasses.modalUI, EditorClasses.thirdUIDepth]);
  const layout = el('div', {}, [EditorClasses.modalUIVerticalLayout]);

  const titleEl = el('h3');
  titleEl.textContent = opts.title;

  const form = el('form');
  const labelEl = el('label');
  labelEl.textContent = opts.inputLabel;
  const input = el('input', { type: 'text', id: opts.id + '-input', placeholder: opts.placeholder ?? '' });
  const submitBtn = el('button', { type: 'submit' });
  submitBtn.textContent = opts.submitLabel;

  form.appendChild(labelEl);
  form.appendChild(input);
  form.appendChild(submitBtn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
      opts.onSubmit(input.value);
      overlay.style.visibility = 'hidden';
      input.value = '';
    }
  });

  layout.appendChild(titleEl);
  layout.appendChild(form);
  modal.appendChild(layout);
  overlay.appendChild(modal);

  triggerBtn.addEventListener('click', () => {
    popout.style.visibility = 'hidden';
    overlay.style.visibility = 'visible';
  });
  overlay.addEventListener('click', () => { overlay.style.visibility = 'hidden'; });
  modal.addEventListener('click', (e) => e.stopPropagation());

  popout.appendChild(triggerBtn);
  wrapper.appendChild(overlay);
}

export function createToolbarButton(config: ToolbarButtonConfig): HTMLElement {
  const wrapper = el('div');

  const btn = el('button', { id: config.id }, [EditorClasses.tooltipButton, 'ts-toolbar-btn']);
  btn.textContent = config.label;

  if (config.tooltipText) {
    const tip = el('span', {}, [EditorClasses.tooltip, EditorClasses.tooltiptextBottom]);
    tip.textContent = config.tooltipText;
    btn.appendChild(tip);
  }

  wrapper.appendChild(btn);

  // Simple click-only button (no popout).
  if (config.onClicked) {
    btn.addEventListener('click', config.onClicked);
    return wrapper;
  }

  const popout = el('div', { id: config.id + '-popout' }, ['ts-toolbar-popout']);

  if (config.onFileUploaded) {
    const fileInput = el('input', {
      type: 'file',
      id: config.id + '-file-input',
      accept: config.fileUploadTypes || '',
      multiple: 'true',
    });
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []) as File[];
      config.onFileUploaded!(files);
      popout.style.visibility = 'hidden';
      fileInput.value = '';
    });

    const importBtn = el('button', { type: 'button' }, ['ts-toolbar-popout-btn', EditorClasses.tooltipButton]);
    importBtn.textContent = 'Import';
    importBtn.addEventListener('click', () => fileInput.click());

    popout.appendChild(fileInput);
    popout.appendChild(importBtn);
  }

  if (config.onUrlSelected) {
    attachTextInputPopup(popout, wrapper, {
      id:          config.id + '-url',
      btnLabel:    'URL',
      title:       'Link to your Asset',
      inputLabel:  'URL',
      submitLabel: 'Import',
      onSubmit:    config.onUrlSelected,
    });
  }

  btn.addEventListener('click', () => { popout.style.visibility = 'visible'; });

  // Close popout when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target as Node)) {
      popout.style.visibility = 'hidden';
    }
  });

  wrapper.appendChild(popout);
  return wrapper;
}

// ---------------------------------------------------------------------------
// Main DOM builder
// ---------------------------------------------------------------------------

export function buildEditorDom(container: HTMLElement, callbacks: EditorToolbarCallbacks = {}): EditorDomRefs {
  injectStyles();

  // Idempotency guard: if this container already has editor DOM, return the
  // existing refs without adding any elements a second time.
  const existingCanvas = container.querySelector<HTMLElement>('#' + EditorIds.canvasParent);
  if (existingCanvas) {
    return { editorParent: container, canvasParent: existingCanvas };
  }

  container.id = EditorIds.editorParent;

  // ── Canvas ───────────────────────────────────────────────────────────────
  const canvasParent = el('div', { id: EditorIds.canvasParent });
  container.appendChild(canvasParent);

  // ── Import toolbar ───────────────────────────────────────────────────────
  const importToolbar = el('div', { id: EditorIds.importToolbar }, [EditorClasses.firstUIDepth]);

  const toolbarButtons: ToolbarButtonConfig[] = [
    {
      id: EditorIds.addTextButton,
      label: 'Text 3D',
      tooltipText: 'Adds a new 3D text component',
      onClicked: callbacks.onAddText || (() => {}),
    },
    {
      id: EditorIds.addModelButton,
      label: 'Model 3D',
      tooltipText: 'Adds a new model component',
      fileUploadTypes: '.gltf,.glb',
      onFileUploaded: callbacks.onUploadModel,
      onUrlSelected: callbacks.onImportModelByUrl,
    },
    {
      id: EditorIds.addLightButton,
      label: 'Light',
      tooltipText: 'Adds a new light component',
      onClicked: callbacks.onAddLight || (() => {}),
    },
    {
      id: EditorIds.addImageButton,
      label: 'Image',
      tooltipText: 'Adds a new image component',
      fileUploadTypes: '.jpg,.jpeg,.png,.webp',
      onFileUploaded: callbacks.onUploadImage,
      onUrlSelected: callbacks.onImportImageByUrl,
    },
    {
      id: EditorIds.addVideoButton,
      label: 'Video',
      tooltipText: 'Adds a new video component',
      fileUploadTypes: '.mp4,.mov,.webm',
      onFileUploaded: callbacks.onUploadVideo,
      onUrlSelected: callbacks.onImportVideoByUrl,
    },
    {
      id: EditorIds.addMusicButton,
      label: 'Music',
      tooltipText: 'Adds a new music component',
      fileUploadTypes: '.mp3,.ogg,.wav',
      onFileUploaded: callbacks.onUploadAudio,
    },
    {
      id: EditorIds.addVFXButton,
      label: 'VFX',
      tooltipText: 'Adds a new VFX component',
      onClicked: callbacks.onShowVFX || (() => {}),
    },
    {
      id: EditorIds.sceneSettingsButton,
      label: 'Scene',
      tooltipText: 'Edit scene settings',
      onClicked: callbacks.onSceneSettings || (() => {}),
    },
  ];

  toolbarButtons.forEach(cfg => importToolbar.appendChild(createToolbarButton(cfg)));
  container.appendChild(importToolbar);

  // ── Properties window ────────────────────────────────────────────────────
  const propertiesWindowParent = el('div', { id: EditorIds.propertiesWindowParent });
  const propertiesWindow = el('div', { id: EditorIds.propertiesWindow });
  const propertiesWindowHeader = el('div', { id: EditorIds.propertiesWindowHeader });
  const propertiesWindowHeaderText = el('p', { id: EditorIds.propertiesWindowHeaderText });
  propertiesWindowHeader.appendChild(propertiesWindowHeaderText);
  propertiesWindow.appendChild(propertiesWindowHeader);
  propertiesWindowParent.appendChild(propertiesWindow);
  container.appendChild(propertiesWindowParent);

  // ── Object toolbar (move/rotate/scale) ───────────────────────────────────
  const bottomCenterParent = el('div', { id: EditorIds.bottomCenterFlexboxParent });
  const objectToolbar = el('div', { id: EditorIds.objectToolbar });
  bottomCenterParent.appendChild(objectToolbar);

  const toolActions = [
    { id: EditorIds.objectSelectButton, label: 'Select', key: 'Q' },
    { id: EditorIds.objectMoveButton,   label: 'Move',   key: 'W' },
    { id: EditorIds.objectRotateButton, label: 'Rotate', key: 'E' },
    { id: EditorIds.objectScaleButton,  label: 'Resize', key: 'R' },
  ];
  toolActions.forEach(({ id, label, key }) => {
    const wrap = el('div');
    const keyLabel = el('p');
    keyLabel.textContent = key;
    keyLabel.style.textAlign = 'center';
    keyLabel.style.margin = '2px';
    keyLabel.style.padding = '0';
    const btn = el('button', { id }, [EditorClasses.tooltipButton]);
    btn.textContent = label;
    wrap.appendChild(keyLabel);
    wrap.appendChild(btn);
    objectToolbar.appendChild(wrap);
  });

  const previewBackButton = el('button', {
    id: EditorIds.previewBackButton,
  }, [EditorClasses.tooltipButton, EditorClasses.fifthUIDepth]);
  previewBackButton.textContent = 'Back';
  container.appendChild(previewBackButton);

  const topCenterParent = el('div', { id: EditorIds.topCenterParentFlexboxParent });
  container.appendChild(topCenterParent);

  // ── Player preview overlay ───────────────────────────────────────────────
  const playerPreviewParent = el('div', { id: EditorIds.playerPreviewParent }, [EditorClasses.fourthUIDepth]);
  playerPreviewParent.style.pointerEvents = 'none';
  container.appendChild(playerPreviewParent);

  // ── VFX selection modal ──────────────────────────────────────────────────
  const vfxSelection = el('div', { id: EditorIds.vfxSelection }, [EditorClasses.modalUIParent]);
  const vfxSelectionBox = el('div', { id: EditorIds.vfxSelectionBox }, [EditorClasses.modalUI]);
  const vfxNav = el('nav');
  const vfxList = el('ul');
  [
    { id: EditorIds.vfxBasicButton, label: 'Basic' },
    { id: EditorIds.vfxDustButton,  label: 'Dust'  },
    { id: EditorIds.vfxSnowButton,  label: 'Snow'  },
    { id: EditorIds.vfxRainButton,  label: 'Rain'  },
    { id: EditorIds.vfxFishButton,  label: 'Fish'  },
  ].forEach(({ id, label }) => {
    const li = el('li');
    const btn = el('button', { id });
    btn.textContent = label;
    li.appendChild(btn);
    vfxList.appendChild(li);
  });
  vfxNav.appendChild(vfxList);
  vfxSelectionBox.appendChild(vfxNav);
  vfxSelection.appendChild(vfxSelectionBox);
  vfxSelection.addEventListener('click', () => { vfxSelection.style.visibility = 'hidden'; });
  vfxSelectionBox.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(vfxSelection);

  // ── Save feedback ────────────────────────────────────────────────────────
  const savingText = el('div', { id: EditorIds.savingText });
  savingText.textContent = 'Saving...';
  const savedText = el('div', { id: EditorIds.savedText });
  savedText.textContent = 'Saved!';
  container.appendChild(savingText);
  container.appendChild(savedText);

  // ── Bottom bar (Preview / Live / Save) ───────────────────────────────────
  const bottomBarUI = el('div', { id: EditorIds.bottomBarUI });
  const previewBtn = el('button', { id: EditorIds.previewButton }, [EditorClasses.tooltipButton]);
  previewBtn.textContent = 'Preview';
  const saveBtn = el('button', { id: EditorIds.saveButton }, [EditorClasses.tooltipButton]);
  saveBtn.textContent = 'Save';
  bottomBarUI.appendChild(previewBtn);
  bottomBarUI.appendChild(saveBtn);
  container.appendChild(bottomBarUI);

  // ── Color picker modal ───────────────────────────────────────────────────
  const colorPickerParent = el('div', { id: EditorIds.colorPickerParent }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  const colorPickerEl = el('div', { id: EditorIds.colorPicker }, [EditorClasses.clickableUI, EditorClasses.thirdUIDepth]);
  colorPickerParent.appendChild(colorPickerEl);
  colorPickerParent.addEventListener('click', () => { colorPickerParent.style.visibility = 'hidden'; });
  colorPickerEl.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(colorPickerParent);

  // ── Text input popup ─────────────────────────────────────────────────────
  const textInputPopupParent = el('div', { id: EditorIds.textInputPopupParent }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  const textInputPopup = el('div', {}, [EditorClasses.modalUI, EditorClasses.thirdUIDepth]);
  const textInputLayout = el('div', {}, [EditorClasses.modalUIVerticalLayout]);
  const textInputTitle = el('h3');
  textInputTitle.textContent = 'Add Text Component';
  const textInputForm = el('form', { id: EditorIds.textInputPopupForm });
  const textInputLabel = el('label');
  textInputLabel.textContent = 'Text';
  const textInput = el('input', { type: 'text', id: EditorIds.textInputPopupInput, name: 'textInputPopupInput' });
  const textSubmit = el('button', { type: 'submit' });
  textSubmit.textContent = 'Add';
  textInputForm.appendChild(textInputLabel);
  textInputForm.appendChild(textInput);
  textInputForm.appendChild(textSubmit);
  textInputLayout.appendChild(textInputTitle);
  textInputLayout.appendChild(textInputForm);
  textInputPopup.appendChild(textInputLayout);
  textInputPopupParent.appendChild(textInputPopup);
  textInputPopupParent.addEventListener('click', () => { textInputPopupParent.style.visibility = 'hidden'; });
  textInputPopup.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(textInputPopupParent);

  // ── Reset scene popup ────────────────────────────────────────────────────
  const resetPopupParent = el('div', { id: EditorIds.resetScenePopupParent }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  const resetPopup = el('div', {}, [EditorClasses.modalUI, EditorClasses.thirdUIDepth]);
  const resetLayout = el('div', {}, [EditorClasses.modalUIVerticalLayout]);
  const resetTitle = el('h3');
  resetTitle.textContent = 'Are you sure you want to reset your entire scene?';
  const resetYes = el('button', { id: EditorIds.resetSceneYesButton });
  resetYes.textContent = 'Yes';
  const resetNo = el('button', { id: EditorIds.resetSceneNoButton });
  resetNo.textContent = 'No';
  resetLayout.appendChild(resetTitle);
  resetLayout.appendChild(resetYes);
  resetLayout.appendChild(resetNo);
  resetPopup.appendChild(resetLayout);
  resetPopupParent.appendChild(resetPopup);
  resetPopupParent.addEventListener('click', () => { resetPopupParent.style.visibility = 'hidden'; });
  resetPopup.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(resetPopupParent);

  // ── Path confirm popup ────────────────────────────────────────────────────
  const pathConfirmParent = el('div', { id: EditorIds.pathConfirmPopupParent }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  pathConfirmParent.style.position = 'fixed';
  const pathConfirmBox = el('div', {}, [EditorClasses.modalUI, EditorClasses.thirdUIDepth]);
  pathConfirmBox.style.width = '380px';
  pathConfirmBox.style.height = 'auto';
  pathConfirmBox.style.padding = '16px';
  const pathConfirmLayout = el('div', {}, [EditorClasses.modalUIVerticalLayout]);
  const pathConfirmTitle = el('h3');
  pathConfirmTitle.textContent = 'Confirm Asset Path';
  const pathConfirmDesc = el('p', { id: EditorIds.pathConfirmPopupLabel });
  pathConfirmDesc.style.fontSize = '12px';
  pathConfirmDesc.style.margin = '4px 0 8px';
  const pathConfirmForm = el('form');
  const pathConfirmInput = el('input', { type: 'text', id: EditorIds.pathConfirmInput });
  pathConfirmInput.style.width = '100%';
  pathConfirmInput.style.marginBottom = '8px';
  const pathConfirmBtnRow = el('div');
  pathConfirmBtnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const pathConfirmCancel = el('button', { type: 'button', id: EditorIds.pathConfirmCancelButton });
  pathConfirmCancel.textContent = 'Cancel';
  const pathConfirmSubmit = el('button', { type: 'submit' });
  pathConfirmSubmit.textContent = 'Load';
  pathConfirmBtnRow.appendChild(pathConfirmCancel);
  pathConfirmBtnRow.appendChild(pathConfirmSubmit);
  pathConfirmForm.appendChild(pathConfirmInput);
  pathConfirmForm.appendChild(pathConfirmBtnRow);
  pathConfirmLayout.appendChild(pathConfirmTitle);
  pathConfirmLayout.appendChild(pathConfirmDesc);
  pathConfirmLayout.appendChild(pathConfirmForm);
  pathConfirmBox.appendChild(pathConfirmLayout);
  pathConfirmParent.appendChild(pathConfirmBox);
  pathConfirmParent.addEventListener('click', () => { pathConfirmParent.style.visibility = 'hidden'; });
  pathConfirmBox.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(pathConfirmParent);

  // ── Save popup ────────────────────────────────────────────────────────────
  const savePopupParent = el('div', { id: EditorIds.savePopupParent }, [EditorClasses.modalUIParent, EditorClasses.secondUIDepth]);
  const savePopup = el('div', {}, [EditorClasses.thirdUIDepth]);
  savePopup.classList.add('ts-save-popup');

  const saveTextarea = el('textarea', { id: EditorIds.savePopupTextarea, readOnly: 'true' });

  const saveBtnRow = el('div');
  saveBtnRow.classList.add('ts-save-popup-buttons');

  const saveBackBtn = el('button', { id: EditorIds.savePopupBackButton });
  saveBackBtn.textContent = 'Back';
  saveBackBtn.addEventListener('click', () => { savePopupParent.style.visibility = 'hidden'; });

  const saveDownloadBtn = el('button', { id: EditorIds.savePopupDownloadButton });
  saveDownloadBtn.textContent = 'Save to Device';

  saveBtnRow.appendChild(saveBackBtn);
  saveBtnRow.appendChild(saveDownloadBtn);
  savePopup.appendChild(saveTextarea);
  savePopup.appendChild(saveBtnRow);
  savePopupParent.appendChild(savePopup);
  savePopupParent.addEventListener('click', () => { savePopupParent.style.visibility = 'hidden'; });
  savePopup.addEventListener('click', (e) => e.stopPropagation());
  container.appendChild(savePopupParent);

  // ── Project view ─────────────────────────────────────────────────────────────
  const projectViewContainer = el('div', { id: EditorIds.projectViewContainer });
  const projectViewToggle = el('button', { id: EditorIds.projectViewToggle });
  projectViewToggle.textContent = 'Project ▾';
  const projectViewPanel = el('div', { id: EditorIds.projectViewPanel });
  const projectViewTree  = el('div', { id: EditorIds.projectViewTree });
  projectViewPanel.appendChild(projectViewTree);
  projectViewContainer.appendChild(projectViewToggle);
  projectViewContainer.appendChild(projectViewPanel);
  container.appendChild(projectViewContainer);

  return {
    editorParent: container,
    canvasParent,
  };
}
