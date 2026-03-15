interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
  fullPath: string;
  expanded: boolean;
}

export class ProjectView {
  private rootPath: string;
  private root: TreeNode;
  private panelEl: HTMLElement;
  private treeEl: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  private collapsed: boolean = false;

  constructor(
    toggleEl: HTMLButtonElement,
    panelEl: HTMLElement,
    treeEl: HTMLElement,
    rootPath: string,
    private onDropAsset: (path: string) => void,
  ) {
    this.toggleBtn = toggleEl;
    this.panelEl = panelEl;
    this.treeEl = treeEl;
    this.rootPath = rootPath;
    this.root = {
      name: rootPath || '/',
      children: new Map(),
      isFile: false,
      fullPath: rootPath,
      expanded: true,
    };

    this.toggleBtn.addEventListener('click', () => this.togglePanel());
    this.render();
  }

  public reset(): void {
    this.root.children.clear();
    this.render();
  }

  public registerAsset(fullPath: string): void {
    const segments = this.parsePath(fullPath);
    if (segments.length === 0) return;
    this.ensureNode(segments, fullPath);
    this.render();
  }

  private parsePath(path: string): string[] {
    let relative = path;
    if (this.rootPath && path.startsWith(this.rootPath)) {
      relative = path.slice(this.rootPath.length);
    }
    return relative.split('/').filter(s => s.length > 0);
  }

  private ensureNode(segments: string[], fullPath: string): void {
    let current = this.root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (!current.children.has(segment)) {
        current.children.set(segment, {
          name: segment,
          children: new Map(),
          isFile: isLast,
          fullPath: isLast ? fullPath : '',
          expanded: true,
        });
      }
      current = current.children.get(segment)!;
    }
  }

  private render(): void {
    this.treeEl.innerHTML = '';
    this.renderNode(this.root, 0, this.treeEl);
  }

  private renderNode(node: TreeNode, indent: number, parent: HTMLElement): void {
    if (node === this.root) {
      const rootEl = document.createElement('div');
      rootEl.className = 'ts-pv-folder';
      rootEl.style.paddingLeft = `${indent * 12 + 8}px`;

      const arrow = document.createElement('span');
      arrow.className = 'ts-pv-arrow';
      arrow.textContent = '▾';

      const icon = document.createElement('span');
      icon.className = 'ts-pv-icon';
      icon.textContent = '📁';

      const label = document.createElement('span');
      label.textContent = node.name;

      rootEl.appendChild(arrow);
      rootEl.appendChild(icon);
      rootEl.appendChild(label);
      parent.appendChild(rootEl);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'ts-pv-children';
      parent.appendChild(childrenContainer);

      node.children.forEach(child => {
        this.renderNode(child, indent + 1, childrenContainer);
      });
      return;
    }

    if (node.isFile) {
      const fileEl = document.createElement('div');
      fileEl.className = 'ts-pv-file';
      fileEl.setAttribute('draggable', 'true');
      fileEl.style.paddingLeft = `${indent * 12 + 8}px`;

      const icon = document.createElement('span');
      icon.className = 'ts-pv-icon';
      icon.textContent = '📄';

      const label = document.createElement('span');
      label.textContent = node.name;

      fileEl.appendChild(icon);
      fileEl.appendChild(label);

      fileEl.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', node.fullPath);
      });

      parent.appendChild(fileEl);
    } else {
      const folderEl = document.createElement('div');
      folderEl.className = 'ts-pv-folder';
      folderEl.style.paddingLeft = `${indent * 12 + 8}px`;

      const arrow = document.createElement('span');
      arrow.className = 'ts-pv-arrow';
      arrow.textContent = node.expanded ? '▾' : '▸';

      const icon = document.createElement('span');
      icon.className = 'ts-pv-icon';
      icon.textContent = '📁';

      const label = document.createElement('span');
      label.textContent = node.name;

      folderEl.appendChild(arrow);
      folderEl.appendChild(icon);
      folderEl.appendChild(label);
      parent.appendChild(folderEl);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = node.expanded ? 'ts-pv-children' : 'ts-pv-children ts-pv-collapsed';
      parent.appendChild(childrenContainer);

      folderEl.addEventListener('click', () => {
        node.expanded = !node.expanded;
        this.render();
      });

      node.children.forEach(child => {
        this.renderNode(child, indent + 1, childrenContainer);
      });
    }
  }

  private togglePanel(): void {
    this.collapsed = !this.collapsed;
    this.panelEl.style.display = this.collapsed ? 'none' : 'block';
    this.toggleBtn.textContent = this.collapsed ? 'Project ▸' : 'Project ▾';
  }
}
