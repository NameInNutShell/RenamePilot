// 분석된 평면적인 변수 목록
export interface VariableInfo {
  name: string;
  type: string;
  kind: 'variable' | 'parameter' | 'property';
  scope: string;
  location: { file: string; line: number; column: number };
  context: string;
}

// VariableInfo와 유사하지만, 자식 노드를 포함
export interface TreeNode {
  name: string;
  kind: string;
  type: string;
  file: string;
  line: number;
  children: TreeNode[];
}
