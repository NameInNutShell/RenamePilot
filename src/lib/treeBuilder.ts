import { TreeNode, VariableInfo } from '../types';

export function buildTree(variables: VariableInfo[]): TreeNode[] {
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // 1. 함수, 클래스 등 부모가 될 수 있는 노드들을 먼저 생성하고 맵에 등록합니다.
  variables.forEach((variable) => {
    const scopeParts = variable.scope.split(' -> ');
    let currentPath = '';

    scopeParts.forEach((part) => {
      if (part === 'global') return;

      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath} -> ${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const newNode: TreeNode = {
          name: part.split(':')[1] || part,
          kind: part.split(':')[0],
          type: 'container', // 부모 노드임을 표시
          file: variable.location.file,
          line: 0, // 부모 노드는 특정 라인이 없음
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

  // 2. 각 변수(variable, parameter, property)를 올바른 부모 노드에 자식으로 추가합니다.
  variables.forEach((variable) => {
    const node: TreeNode = {
      name: variable.name,
      kind: variable.kind,
      type: variable.type,
      file: variable.location.file,
      line: variable.location.line,
      children: [], // 변수는 자식이 없음
    };

    if (variable.scope === 'global') {
      rootNodes.push(node);
    } else {
      const parentNode = nodeMap.get(variable.scope);
      if (parentNode) {
        // 매개변수를 자식 목록의 맨 앞에 추가하여 함수 바로 아래에 보이도록 합니다.
        if (node.kind === 'parameter') {
          parentNode.children.unshift(node);
        } else {
          parentNode.children.push(node);
        }
      }
    }
  });

  return rootNodes;
}
