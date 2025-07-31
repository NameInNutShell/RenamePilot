// webview-ui/modules/variableList.js
// 변수 목록 표시 및 관리 기능들

/**
 * 변수 목록 업데이트
 * @param {Array} variables - 변수 배열
 * @param {Function} onVariableClick - 변수 클릭 시 호출할 함수
 */
function updateVariableList(variables, onVariableClick) {
  // 통계 업데이트
  const stats = {
    total: variables.length,
    variable: variables.filter((v) => v.kind === 'variable').length,
    parameter: variables.filter((v) => v.kind === 'parameter').length,
    property: variables.filter((v) => v.kind === 'property').length,
  };

  // DOM 요소 업데이트
  const totalVarsEl = document.getElementById('total-vars');
  const varCountEl = document.getElementById('var-count');
  const paramCountEl = document.getElementById('param-count');
  const propCountEl = document.getElementById('prop-count');
  
  if (totalVarsEl) totalVarsEl.textContent = stats.total;
  if (varCountEl) varCountEl.textContent = stats.variable;
  if (paramCountEl) paramCountEl.textContent = stats.parameter;
  if (propCountEl) propCountEl.textContent = stats.property;

  // 변수 목록 렌더링
  const variableList = document.getElementById('variable-list');
  if (!variableList) return;

  if (variables.length === 0) {
    variableList.innerHTML = '<div class="empty-state">분석된 변수가 없습니다.</div>';
    return;
  }

  variableList.innerHTML = variables
    .map(
      (variable) => `
    <div class="variable-item" data-variable='${JSON.stringify(variable)}'>
      <div class="variable-header">
        <span class="variable-name">${window.ValidationModule.escapeHtml(variable.name)}</span>
        <span class="variable-type">${variable.kind}</span>
      </div>
      <div class="variable-details">
        <span class="variable-location">줄 ${variable.location.line}</span>
        <span class="variable-scope">${window.ValidationModule.escapeHtml(variable.scope)}</span>
      </div>
    </div>
  `
    )
    .join('');

  // 클릭 이벤트 추가
  document.querySelectorAll('.variable-item').forEach((item) => {
    item.addEventListener('click', () => {
      const variable = JSON.parse(item.dataset.variable);
      if (onVariableClick) {
        onVariableClick(variable);
      }
    });
  });
}

// 모듈 내보내기
window.VariableListModule = {
  updateVariableList
};