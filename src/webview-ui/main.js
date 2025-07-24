// webview-ui/main.js - 사용자 피드백이 개선된 완성 버전
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
      if (isValidVariableName(newName)) {
        applyRename(selectedVariable, newName);
      } else {
        showError('올바른 변수명 형식이 아닙니다.');
      }
    }
  });

  customNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const newName = customNameInput.value.trim();
      if (newName && selectedVariable) {
        if (isValidVariableName(newName)) {
          applyRename(selectedVariable, newName);
        } else {
          showError('올바른 변수명 형식이 아닙니다.');
        }
      }
    }
  });

  // 변수명 유효성 검사
  function isValidVariableName(name) {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  // 에러 메시지 표시
  function showError(message) {
    // 간단한 에러 표시
    const errorEl = document.createElement('div');
    errorEl.textContent = message;
    errorEl.style.color = 'var(--vscode-errorForeground)';
    errorEl.style.backgroundColor = 'var(--vscode-inputValidation-errorBackground)';
    errorEl.style.padding = '4px 8px';
    errorEl.style.borderRadius = '2px';
    errorEl.style.fontSize = '12px';
    errorEl.style.marginTop = '4px';
    
    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    errorEl.className = 'error-message';
    customNameInput.parentNode.appendChild(errorEl);
    
    // 3초 후 제거
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 3000);
  }

  // 성공 메시지 표시
  function showSuccess(message) {
    const successEl = document.createElement('div');
    successEl.textContent = message;
    successEl.style.color = 'var(--vscode-notificationsInfoIcon-foreground)';
    successEl.style.backgroundColor = 'var(--vscode-inputValidation-infoBackground)';
    successEl.style.padding = '4px 8px';
    successEl.style.borderRadius = '2px';
    successEl.style.fontSize = '12px';
    successEl.style.position = 'fixed';
    successEl.style.top = '10px';
    successEl.style.right = '10px';
    successEl.style.zIndex = '9999';
    
    document.body.appendChild(successEl);
    
    // 3초 후 제거
    setTimeout(() => {
      if (successEl.parentNode) {
        successEl.parentNode.removeChild(successEl);
      }
    }, 3000);
  }

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

    // 기존 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

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
    console.log(`Applying rename: ${variable.name} -> ${newName}`);
    
    // 적용 버튼 비활성화 및 로딩 표시
    const applyButtons = document.querySelectorAll('.apply-button, .suggestion-item');
    applyButtons.forEach(btn => {
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    });
    
    // 로딩 메시지 표시
    const loadingEl = document.createElement('div');
    loadingEl.textContent = '변수명 변경 중...';
    loadingEl.style.color = 'var(--vscode-descriptionForeground)';
    loadingEl.style.fontSize = '12px';
    loadingEl.style.textAlign = 'center';
    loadingEl.style.marginTop = '8px';
    loadingEl.className = 'loading-message';
    
    const modalBody = document.querySelector('.modal-body');
    modalBody.appendChild(loadingEl);
    
    vscode.postMessage({
      command: 'renameVariable',
      variable: variable,
      newName: newName,
    });
  }

  // 모달 닫기
  function closeModal() {
    modal.classList.add('hidden');
    selectedVariable = null;
    customNameInput.value = '';
    suggestionsListEl.innerHTML = '';
    
    // 에러 메시지 제거
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // 로딩 메시지 제거
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
      loadingMessage.remove();
    }
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
        // 로딩 메시지 제거
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
          loadingMessage.remove();
        }
        
        // 버튼들 다시 활성화
        const applyButtons = document.querySelectorAll('.apply-button, .suggestion-item');
        applyButtons.forEach(btn => {
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        });
        
        if (message.success) {
          showSuccess(`변수명이 "${message.oldName}"에서 "${message.newName}"으로 변경되었습니다.`);
          closeModal();
        } else {
          showError(message.error || '변수명 변경에 실패했습니다.');
        }
        break;
    }
  });
})();