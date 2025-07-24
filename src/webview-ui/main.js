(function () {
  const vscode = acquireVsCodeApi();

  let currentVariables = [];
  let selectedVariable = null;

  // DOM 요소들
  const refreshButton = document.getElementById('refresh-button');
  const variableList = document.getElementById('variable-list');
  const totalVarsEl = document.getElementById('total-vars');
  const varCountEl = document.getElementById('var-count');
  const paramCountEl = document.getElementById('param-count');
  const propCountEl = document.getElementById('prop-count');
  const modal = document.getElementById('suggestion-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const currentVarNameEl = document.getElementById('current-var-name');
  const suggestionsListEl = document.getElementById('suggestions-list');
  const customNameInput = document.getElementById('custom-name-input');
  const applyCustomNameBtn = document.getElementById('apply-custom-name');

  // 이벤트 리스너
  refreshButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'requestRefresh' });
  });

  closeModalBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  applyCustomNameBtn.addEventListener('click', () => {
    const newName = customNameInput.value.trim();
    if (newName && selectedVariable) {
      applyRename(selectedVariable, newName);
    }
  });

  customNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const newName = customNameInput.value.trim();
      if (newName && selectedVariable) {
        applyRename(selectedVariable, newName);
      }
    }
  });

  // 변수 목록 업데이트
  function updateVariableList(variables) {
    currentVariables = variables;

    // 통계 업데이트
    const stats = {
      total: variables.length,
      variable: variables.filter((v) => v.kind === 'variable').length,
      parameter: variables.filter((v) => v.kind === 'parameter').length,
      property: variables.filter((v) => v.kind === 'property').length,
    };

    totalVarsEl.textContent = stats.total;
    varCountEl.textContent = stats.variable;
    paramCountEl.textContent = stats.parameter;
    propCountEl.textContent = stats.property;

    // 변수 목록 렌더링
    if (variables.length === 0) {
      variableList.innerHTML =
        '<div class="empty-state">분석된 변수가 없습니다.</div>';
      return;
    }

    variableList.innerHTML = variables
      .map(
        (variable) => `
      <div class="variable-item" data-variable='${JSON.stringify(variable)}'>
        <div class="variable-header">
          <span class="variable-name">${escapeHtml(variable.name)}</span>
          <span class="variable-type">${variable.kind}</span>
        </div>
        <div class="variable-details">
          <span class="variable-location">줄 ${variable.location.line}</span>
          <span class="variable-scope">${escapeHtml(variable.scope)}</span>
        </div>
      </div>
    `
      )
      .join('');

    // 클릭 이벤트 추가
    document.querySelectorAll('.variable-item').forEach((item) => {
      item.addEventListener('click', () => {
        const variable = JSON.parse(item.dataset.variable);
        showSuggestions(variable);
      });
    });
  }

  // 추천 모달 표시
  function showSuggestions(variable) {
    selectedVariable = variable;
    currentVarNameEl.textContent = variable.name;
    customNameInput.value = variable.name;
    suggestionsListEl.innerHTML =
      '<div class="loading">추천 이름 생성 중...</div>';
    modal.classList.remove('hidden');

    // 추천 요청
    vscode.postMessage({
      command: 'getSuggestions',
      variable: variable,
    });
  }

  // 추천 목록 표시
  function displaySuggestions(variableName, suggestions) {
    if (selectedVariable && selectedVariable.name === variableName) {
      if (suggestions.length === 0) {
        suggestionsListEl.innerHTML =
          '<div class="empty-state">추천할 이름이 없습니다.</div>';
        return;
      }

      suggestionsListEl.innerHTML = suggestions
        .map(
          (suggestion) => `
        <div class="suggestion-item" data-name="${escapeHtml(suggestion)}">
          ${escapeHtml(suggestion)}
        </div>
      `
        )
        .join('');

      // 클릭 이벤트 추가
      document.querySelectorAll('.suggestion-item').forEach((item) => {
        item.addEventListener('click', () => {
          const newName = item.dataset.name;
          applyRename(selectedVariable, newName);
        });
      });
    }
  }

  // 변수명 변경 적용
  function applyRename(variable, newName) {
    vscode.postMessage({
      command: 'renameVariable',
      variable: variable,
      newName: newName,
    });
    closeModal();
  }

  // 모달 닫기
  function closeModal() {
    modal.classList.add('hidden');
    selectedVariable = null;
    customNameInput.value = '';
    suggestionsListEl.innerHTML = '';
  }

  // HTML 이스케이프
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // VSCode로부터 메시지 수신
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.command) {
      case 'updateVariables':
        updateVariableList(message.variables);
        break;

      case 'showSuggestions':
        displaySuggestions(message.variableName, message.suggestions);
        break;

      case 'renameComplete':
        // 변경 완료 후 새로고침 요청
        vscode.postMessage({ command: 'requestRefresh' });
        break;
    }
  });
})();
