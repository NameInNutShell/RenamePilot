import { createVariableList, createSuggestionList } from './templates.js';

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

  // --- Functions ---

  /**
   * Creates the nested HTML list for the tree view.
   * This is a "recursive" function.
   * @param {Array} nodes - An array of tree nodes.
   * @returns {HTMLUListElement}
   */
  function createTreeElement(nodes) {
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
      // Replace this with your own icon logic if you wish
      const icon =
        node.kind === 'class' ||
        node.kind === 'function' ||
        node.kind === 'method'
          ? '📦'
          : '🔹';
      nodeContent.innerHTML = `${icon} ${escapeHtml(node.name)} <small>(${
        node.kind
      })</small>`;
      li.appendChild(nodeContent);

      // Only add click listeners to actual variables
      if (!hasChildren) {
        li.dataset.variable = JSON.stringify(node);
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          const variable = JSON.parse(li.dataset.variable);
          showSuggestions(variable);
        });
      }

      // If the node has children, create a sub-tree and handle toggling
      if (hasChildren) {
        nodeContent.addEventListener('click', (e) => {
          e.stopPropagation();
          li.classList.toggle('expanded');
        });
        const childrenUl = createTreeElement(node.children);
        li.appendChild(childrenUl);
      }

      ul.appendChild(li);
    }
    return ul;
  }

  // Modified update function
  function updateVariableList(treeData) {
    // Flatten the tree to calculate stats (this part is assumed to exist)
    const flatList = (nodes) =>
      nodes.reduce((acc, node) => {
        acc.push(node);
        if (node.children) acc.push(...flatList(node.children));
        return acc;
      }, []);

    currentVariables = flatList(treeData);

    // Update stats (your existing logic)
    const stats = {
      total: currentVariables.length,
      variable: currentVariables.filter((v) => v.kind === 'variable').length,
      parameter: currentVariables.filter((v) => v.kind === 'parameter').length,
      property: currentVariables.filter((v) => v.kind === 'property').length,
    };
    totalVarsEl.textContent = stats.total;
    varCountEl.textContent = stats.variable;
    paramCountEl.textContent = stats.parameter;
    propCountEl.textContent = stats.property;

    // Render the tree structure
    if (treeData.length === 0) {
      variableList.innerHTML =
        '<div class="empty-state">분석된 변수가 없습니다.</div>';
      return;
    }

    const treeElement = createTreeElement(treeData);
    variableList.innerHTML = ''; // Clear previous content
    variableList.appendChild(treeElement);
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
    console.log('잘 받았는지 확인');
    console.log(message);

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
