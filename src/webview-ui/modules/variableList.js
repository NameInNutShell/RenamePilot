// src/webview-ui/modules/variableList.js

/**
 * 평면적인 변수 목록을 받아서 계층적인 트리 구조로 변환합니다.
 * @param {Array} variables - VariableInfo[] 형태의 평면 배열
 * @returns {Array} TreeNode[] 형태의 트리 구조 배열
 */
function buildTree(variables) {
  const rootNodes = [];
  const nodeMap = new Map();

  // 1. 스코프를 기반으로 부모 노드들을 먼저 생성합니다.
  variables.forEach((variable) => {
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

        if (parentPath && nodeMap.has(parentPath)) {
          nodeMap.get(parentPath).children.push(newNode);
        } else {
          rootNodes.push(newNode);
        }
      }
    });
  });

  // 2. 각 변수를 올바른 부모 노드에 연결합니다.
  variables.forEach((variable) => {
    const node = { ...variable, children: [] };

    if (variable.scope === 'global') {
      rootNodes.push(node);
    } else if (nodeMap.has(variable.scope)) {
      nodeMap.get(variable.scope).children.push(node);
    }
  });

  return rootNodes;
}

/**
 * 트리 데이터를 기반으로 HTML <ul> 요소를 재귀적으로 생성합니다.
 * @param {Array} nodes - TreeNode 배열
 * @param {Function} onVariableClick - 변수 노드를 클릭했을 때 실행될 콜백 함수
 * @returns {HTMLUListElement}
 */
function createTreeElement(nodes, onVariableClick) {
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
    nodeContent.innerHTML = `${icon} ${escapeHtml(node.name)} <small>(${
      node.kind
    })</small>`;
    li.appendChild(nodeContent);

    // 실제 변수인 경우(자식이 없는 노드)에만 클릭 이벤트를 추가합니다.
    if (!hasChildren) {
      li.dataset.variable = JSON.stringify(node);
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const variable = JSON.parse(li.dataset.variable);
        onVariableClick(variable);
      });
    }

    // 자식 노드가 있으면 하위 트리를 생성하고 토글 이벤트를 추가합니다.
    if (hasChildren) {
      nodeContent.addEventListener('click', (e) => {
        e.stopPropagation(); // 자식/부모의 토글이 동시에 일어나는 것을 방지
        li.classList.toggle('expanded');
      });
      const childrenUl = createTreeElement(node.children, onVariableClick);
      li.appendChild(childrenUl);
    }

    ul.appendChild(li);
  }
  return ul;
}

// 통계 계산을 위해 트리 데이터를 1차원 배열로 변환합니다.
function flattenTree(nodes) {
  return nodes.reduce((acc, node) => {
    acc.push(node);
    if (node.children) acc.push(...flattenTree(node.children));
    return acc;
  }, []);
}

function getIconForKind(kind) {
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

/**
 * 이 모듈의 메인 진입 함수입니다.
 * @param {Array} rawData - VariableInfo[] 형태의 가공되지 않은 원본 데이터
 * @param {Function} onVariableClick - 변수 클릭 시 호출될 콜백 함수
 * @Param {string} type - rule | ai
 */
function updateVariableList(rawData, onVariableClick) {
  // 1. 원본 데이터를 트리 구조로 변환합니다.
  const treeData = buildTree(rawData);

  // 2. 통계 계산을 위해 다시 평면화합니다.
  const flatList = flattenTree(treeData);

  // 3. 통계 DOM 요소를 업데이트합니다.
  document.getElementById('total-vars').textContent = flatList.length;
  document.getElementById('var-count').textContent = flatList.filter(
    (v) => v.kind === 'variable'
  ).length;
  document.getElementById('param-count').textContent = flatList.filter(
    (v) => v.kind === 'parameter'
  ).length;
  document.getElementById('prop-count').textContent = flatList.filter(
    (v) => v.kind === 'property'
  ).length;

  // 4. 트리 구조를 렌더링합니다.
  const container = document.getElementById('variable-list');
  if (!treeData || treeData.length === 0) {
    container.innerHTML =
      '<div class="empty-state">분석된 변수가 없습니다.</div>';
    return;
  }

  const treeElement = createTreeElement(treeData, onVariableClick);
  container.innerHTML = '';
  container.appendChild(treeElement);
}

// 모듈을 전역 window 객체에 등록
window.VariableListModule = {
  updateVariableList,
};
