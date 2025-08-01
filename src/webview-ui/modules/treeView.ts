// src/webview-ui/modules/treeView.js
import * as ValidationModule from './validation';
import { TreeNode, VariableInfo } from '../../types';
/**
 * 평면적인 변수 목록을 받아서 계층적인 트리 구조로 변환합니다.
 * @param {Array} variables - VariableInfo[] 형태의 평면 배열
 * @returns {Array} TreeNode[] 형태의 트리 구조 배열
 */
export function buildTree(variables: VariableInfo[]): TreeNode[] {
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // 1. 스코프를 기반으로 부모 노드들을 먼저 생성합니다.
  variables.forEach((variable: VariableInfo) => {
    const scopeParts = variable.scope.split(' -> ');
    let currentPath = '';

    scopeParts.forEach((part) => {
      if (part === 'global') return;

      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath} -> ${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const newNode = {
          name: part.split(':')[1] || part,
          kind: part.split(':')[0],
          type: '',
          file: '',
          line: 0,
          children: [],
        };
        nodeMap.set(currentPath, newNode);

        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(newNode);
        } else {
          rootNodes.push(newNode);
        }
      }
    });
  });

  // 2. 각 변수를 올바른 부모 노드에 연결합니다.
  variables.forEach((variable) => {
    const node = {
      name: variable.name,
      kind: variable.kind,
      type: variable.type,
      file: variable.location.file,
      line: variable.location.line,
      children: [],
    };

    if (variable.scope === 'global') {
      rootNodes.push(node);
    } else {
      const parentNode = nodeMap.get(variable.scope);
      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });

  return rootNodes;
}

/**
 * 트리 데이터를 기반으로 HTML <ul> 요소를 재귀적으로 생성합니다.
 * @param {Array} nodes - TreeNode 배열
 * @param {Function} onVariableClick - 변수 노드를 클릭했을 때 실행될 콜백 함수
 * @returns {parentNode}
 */
export function createTreeElement(
  nodes: TreeNode[],
  onVariableClick: (variable: TreeNode) => void
): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.className = 'variable-tree';

  for (const node of nodes) {
    const li = document.createElement('li');
    li.className = 'tree-node';

    const hasChildren = node.children && node.children.length > 0;
    if (hasChildren) {
      li.classList.add('has-children');
    }

    const nodeContent = document.createElement('span');
    const icon = getIconForKind(node.kind);
    // window.ValidationModule.escapeHtml를 사용한다고 가정
    nodeContent.innerHTML = `${icon} ${ValidationModule.escapeHtml(
      node.name
    )} <small>(${node.kind})</small>`;
    li.appendChild(nodeContent);

    // 실제 변수인 경우에만 클릭 이벤트를 추가합니다.
    if (['variable', 'parameter', 'property'].includes(node.kind)) {
      // li.dataset.variable = JSON.stringify(node);
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        // const variable = JSON.parse(li.dataset.variable);
        onVariableClick(node);
      });
    }

    // 자식 노드가 있으면 하위 트리를 생성하고 토글 이벤트를 추가합니다.
    if (hasChildren) {
      nodeContent.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('expanded');
      });
      li.appendChild(createTreeElement(node.children, onVariableClick));
    }

    ul.appendChild(li);
  }
  return ul;
}

/**
 * 통계 계산을 위해 트리 데이터를 1차원 배열로 변환합니다.
 * @param {Array} nodes - TreeNode 배열
 * @returns {Array} 1차원 배열
 */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.reduce((acc, node) => {
    acc.push(node);
    if (node.children) acc.push(...flattenTree(node.children));
    return acc;
  }, [] as TreeNode[]);
}

function getIconForKind(kind: string) {
  switch (kind) {
    case 'class':
      return '🗂️';
    case 'method':
    case 'function':
      return '📦';
    case 'variable':
      return '🔹';
    case 'parameter':
      return '🔸';
    case 'property':
      return '▫️';
    default:
      return '·';
  }
}
