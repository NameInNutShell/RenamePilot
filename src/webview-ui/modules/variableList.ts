// webview-ui/modules/variableList.js
// 변수 목록 표시 및 관리 기능들
import { VariableInfo, TreeNode } from '../../types';
import * as TreeModule from './treeView';

/**
 * 변수 목록 업데이트
 * @param {Array} variables - 변수 배열
 * @param {Function} onVariableClick - 변수 클릭 시 호출할 함수
 */
export function updateVariableList(
  variables: VariableInfo[],
  onVariableClick: (variable: TreeNode) => void
): void {
  const treeData: TreeNode[] = TreeModule.buildTree(variables);
  console.log('tree 첫 요소 : ', treeData[0]);
  // 통계 업데이트
  const stats = {
    total: variables.length,
    variable: variables.filter((v) => v.kind === 'variable').length,
    parameter: variables.filter((v) => v.kind === 'parameter').length,
    property: variables.filter((v) => v.kind === 'property').length,
  };

  // 통계 : DOM 요소 업데이트
  const totalVarsEl = document.getElementById('total-vars');
  const varCountEl = document.getElementById('var-count');
  const paramCountEl = document.getElementById('param-count');
  const propCountEl = document.getElementById('prop-count');

  if (totalVarsEl) totalVarsEl.textContent = String(stats.total);
  if (varCountEl) varCountEl.textContent = String(stats.variable);
  if (paramCountEl) paramCountEl.textContent = String(stats.parameter);
  if (propCountEl) propCountEl.textContent = String(stats.property);

  // 변수 목록 렌더링
  const variableListContainer = document.getElementById(
    'variable-list'
  ) as HTMLElement;
  if (!variableListContainer) return;

  if (!treeData || treeData.length === 0) {
    variableListContainer.innerHTML =
      '<div class="empty-state">분석된 변수가 없습니다.</div>';
    return;
  }

  const treeElement = TreeModule.createTreeElement(treeData, onVariableClick);
  variableListContainer.innerHTML = '';
  variableListContainer.appendChild(treeElement);
}

// // 모듈 내보내기
// window.VariableListModule = {
//   updateVariableList,
// };
