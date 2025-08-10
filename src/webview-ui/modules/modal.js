// webview-ui/modules/modal.js
// 추천 모달 관련 기능들

let selectedVariable = null;

const modal = document.getElementById('suggestion-modal');
const currentVarNameEl = document.getElementById('current-var-name');
const customNameInput = document.getElementById('custom-name-input');
const suggestionsListEl = document.getElementById('suggestions-list');

const aiSuggestionButton = document.getElementById('ai-suggestion-button');
const aiSuggestionsListEl = document.getElementById('ai-suggestions-list');
const closeModalBtn = document.getElementById('close-modal');

/**
 * 추천 모달 표시
 * @param {Object} variable - 선택된 변수 정보
 * @param {Function} onGetSuggestions - 추천 요청 함수
 */
function showSuggestions(variable, onGetSuggestions, type) {
  selectedVariable = variable;

  if (!modal || !currentVarNameEl || !customNameInput || !suggestionsListEl) {
    console.error('Modal elements not found');
    return;
  }

  currentVarNameEl.textContent = variable.name;
  customNameInput.value = variable.name;

  // 목록 초기화
  suggestionsListEl.innerHTML =
    '<div class="loading">추천 이름 생성 중...</div>';
  aiSuggestionsListEl.innerHTML = '';
  modal.classList.remove('hidden');

  // 기존 메시지들 제거
  window.FeedbackModule.clearAllMessages();

  // 추천 요청
  if (onGetSuggestions) {
    onGetSuggestions(variable, type);
  }
}

/**
 * 추천 목록 표시
 * @param {string} variableName - 변수명
 * @param {Array} suggestions - 추천 목록
 * @param {Function} onApplyRename - 변수명 변경 함수
 */
function displaySuggestions(variableName, suggestions, onApplyRename, type) {
  if (!selectedVariable || selectedVariable.name !== variableName) {
    return;
  }

  const targetList = type === 'ai' ? aiSuggestionsListEl : suggestionsListEl;

  // const suggestionsListEl = document.getElementById('suggestions-list');
  // if (!suggestionsListEl) return;

  if (suggestions.length === 0) {
    targetList.innerHTML = `<div class="empty-state">${
      type === 'ai' ? 'AI 추천이 없습니다.' : '추천할 이름이 없습니다.'
    }</div>`;
    return;
  }

  targetList.innerHTML = suggestions
    .map(
      (suggestion) => `
    <div class="suggestion-item" data-name="${window.ValidationModule.escapeHtml(
      suggestion
    )}">
      ${window.ValidationModule.escapeHtml(suggestion)}
    </div>
  `
    )
    .join('');

  // 클릭 이벤트 추가
  targetList.querySelectorAll('.suggestion-item').forEach((item) => {
    item.addEventListener('click', () => {
      const newName = item.dataset.name;
      if (onApplyRename && selectedVariable) {
        onApplyRename(selectedVariable, newName);
      }
    });
  });
}

/**
 * 모달 닫기
 */
function closeModal() {
  if (modal) modal.classList.add('hidden');
  if (customNameInput) customNameInput.value = '';
  if (suggestionsListEl) suggestionsListEl.innerHTML = '';

  selectedVariable = null;
  window.FeedbackModule.clearAllMessages();
}

/**
 * 현재 선택된 변수 반환
 */
function getSelectedVariable() {
  return selectedVariable;
}

/**
 * 모달 이벤트 리스너 설정
 * @param {Function} onApplyRename - 변수명 변경 함수
 */
function setupModalEventListeners(onApplyRename, onGetAiSuggestions) {
  aiSuggestionButton.addEventListener('click', () => {
    if (selectedVariable) {
      aiSuggestionsListEl.innerHTML =
        '<div class="loading">AI 추천 이름 생성 중...</div>';
      onGetAiSuggestions(selectedVariable, 'ai');
    }
  });
  // 모달 닫기 버튼
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // 모달 배경 클릭시 닫기
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // 커스텀 이름 적용 버튼
  if (applyCustomNameBtn) {
    applyCustomNameBtn.addEventListener('click', () => {
      if (customNameInput && selectedVariable) {
        const newName = customNameInput.value.trim();
        if (newName) {
          if (window.ValidationModule.isValidVariableName(newName)) {
            onApplyRename(selectedVariable, newName);
          } else {
            window.FeedbackModule.showError('올바른 변수명 형식이 아닙니다.');
          }
        }
      }
    });
  }

  // Enter 키 처리
  if (customNameInput) {
    customNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && selectedVariable) {
        const newName = customNameInput.value.trim();
        if (newName) {
          if (window.ValidationModule.isValidVariableName(newName)) {
            onApplyRename(selectedVariable, newName);
          } else {
            window.FeedbackModule.showError('올바른 변수명 형식이 아닙니다.');
          }
        }
      }
    });
  }
}

// 모듈 내보내기
window.ModalModule = {
  showSuggestions,
  displaySuggestions,
  closeModal,
  getSelectedVariable,
  setupModalEventListeners,
};
