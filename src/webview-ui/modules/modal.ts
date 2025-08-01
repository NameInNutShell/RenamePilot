// src/webview-ui/modules/modal.ts
import { TreeNode } from '../../types';

// DOM 요소들을 관리하는 객체
const elements = {
  modal: document.getElementById('suggestion-modal') as HTMLElement,
  closeModalBtn: document.getElementById('close-modal') as HTMLButtonElement,
  currentVarNameEl: document.getElementById('current-var-name') as HTMLElement,
  suggestionsListEl: document.getElementById('suggestions-list') as HTMLElement,
  customNameInput: document.getElementById(
    'custom-name-input'
  ) as HTMLInputElement,
  applyCustomNameBtn: document.getElementById(
    'apply-custom-name'
  ) as HTMLButtonElement,
};

// 현재 선택된 변수의 상태를 저장
let selectedVariable: TreeNode | null = null;

/**
 * 추천 모달을 표시합니다.
 * @param variable - 선택된 변수 정보 (TreeNode)
 * @param onGetSuggestions - 추천 목록을 요청하는 콜백 함수
 */
export function showSuggestions(
  variable: TreeNode,
  onGetSuggestions: (variable: TreeNode) => void
): void {
  selectedVariable = variable;

  elements.currentVarNameEl.textContent = variable.name;
  elements.customNameInput.value = variable.name;
  elements.suggestionsListEl.innerHTML =
    '<div class="loading">추천 이름 생성 중...</div>';
  elements.modal.classList.remove('hidden');

  // @ts-ignore
  window.FeedbackModule?.clearAllMessages();

  if (onGetSuggestions) {
    onGetSuggestions(variable);
  }
}

/**
 * 추천 목록을 UI에 표시합니다.
 * @param variableName - 추천이 요청된 변수의 이름
 * @param suggestions - 추천된 이름들의 배열
 * @param onApplyRename - 이름 변경을 적용하는 콜백 함수
 */
export function displaySuggestions(
  variableName: string,
  suggestions: string[],
  onApplyRename: (variable: TreeNode, newName: string) => void // ✨ 타입 변경
): void {
  if (!selectedVariable || selectedVariable.name !== variableName) {
    return;
  }

  if (suggestions.length === 0) {
    elements.suggestionsListEl.innerHTML =
      '<div class="empty-state">추천할 이름이 없습니다.</div>';
    return;
  }

  // @ts-ignore
  const escapeHtml = window.ValidationModule.escapeHtml;
  elements.suggestionsListEl.innerHTML = suggestions
    .map(
      (suggestion) =>
        `<div class="suggestion-item" data-name="${escapeHtml(
          suggestion
        )}">${escapeHtml(suggestion)}</div>`
    )
    .join('');

  elements.suggestionsListEl
    .querySelectorAll('.suggestion-item')
    .forEach((item) => {
      item.addEventListener('click', () => {
        const newName = (item as HTMLElement).dataset.name;
        if (newName && selectedVariable) {
          onApplyRename(selectedVariable, newName);
        }
      });
    });
}

/**
 * 모달을 닫고 상태를 초기화합니다.
 */
export function closeModal(): void {
  elements.modal.classList.add('hidden');
  elements.customNameInput.value = '';
  elements.suggestionsListEl.innerHTML = '';
  selectedVariable = null;
  // @ts-ignore
  window.FeedbackModule?.clearAllMessages();
}

/**
 * 모달의 모든 이벤트 리스너를 설정합니다.
 * @param onApplyRename - 이름 변경을 적용하는 콜백 함수
 */
export function setupModalEventListeners(
  onApplyRename: (variable: TreeNode, newName: string) => void // ✨ 타입 변경
): void {
  elements.closeModalBtn.addEventListener('click', closeModal);

  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
      closeModal();
    }
  });

  const applyCustomRename = () => {
    if (selectedVariable) {
      const newName = elements.customNameInput.value.trim();
      if (newName) {
        // @ts-ignore
        if (window.ValidationModule.isValidVariableName(newName)) {
          onApplyRename(selectedVariable, newName);
        } else {
          // @ts-ignore
          window.FeedbackModule.showError('올바른 변수명 형식이 아닙니다.');
        }
      }
    }
  };

  elements.applyCustomNameBtn.addEventListener('click', applyCustomRename);
  elements.customNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyCustomRename();
    }
  });
}
