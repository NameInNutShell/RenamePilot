import { TreeNode, VariableInfo } from '../types'; // 1단계에서 만든 타입

export function buildTree(variables: VariableInfo[]): TreeNode[] {
  const rootNodes: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>(); // 빠른 조회를 위한 맵

  // 1. 전역 스코프의 변수와 부모 노드들을 먼저 생성
  variables.forEach((variable) => {
    const scopeParts = variable.scope.split(' -> ');
    let currentPath = '';

    // 스코프 경로에 따라 부모 노드 생성 (e.g., class:A -> method:B)
    scopeParts.forEach((part) => {
      if (part === 'global') return;

      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath} -> ${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const newNode: TreeNode = {
          name: part.split(':')[1] || part,
          kind: part.split(':')[0],
          type: '',
          file: '',
          line: 0, // 부모 노드는 위치 정보가 없음
          children: [],
        };
        nodeMap.set(currentPath, newNode);

        if (parentPath && nodeMap.has(parentPath)) {
          nodeMap.get(parentPath)!.children.push(newNode);
        } else {
          rootNodes.push(newNode);
        }
      }
    });
  });

  // 2. 각 변수를 올바른 부모 노드에 연결
  variables.forEach((variable) => {
    const node: TreeNode = {
      name: variable.name,
      kind: variable.kind,
      type: variable.type,
      file: variable.location.file,
      line: variable.location.line,
      children: [],
    };

    if (variable.scope === 'global') {
      rootNodes.push(node);
    } else if (nodeMap.has(variable.scope)) {
      nodeMap.get(variable.scope)!.children.push(node);
    }
  });

  return rootNodes;
}
