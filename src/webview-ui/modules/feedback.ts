// webview-ui/modules/feedback.js
// 사용자 피드백 (에러, 성공, 로딩) 관련 기능들

/**
 * 에러 메시지 표시
 * @param {string} message - 표시할 에러 메시지
 */
export function showError(message: string) {
  // 기존 에러 메시지 제거
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }

  const errorEl = document.createElement('div');
  errorEl.textContent = message;
  errorEl.style.color = 'var(--vscode-errorForeground)';
  errorEl.style.backgroundColor =
    'var(--vscode-inputValidation-errorBackground)';
  errorEl.style.padding = '4px 8px';
  errorEl.style.borderRadius = '2px';
  errorEl.style.fontSize = '12px';
  errorEl.style.marginTop = '4px';
  errorEl.className = 'error-message';

  const customNameInput = document.getElementById('custom-name-input');
  if (customNameInput && customNameInput.parentNode) {
    customNameInput.parentNode.appendChild(errorEl);

    // 3초 후 제거
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 3000);
  }
}

/**
 * 성공 메시지 표시
 * @param {string} message - 표시할 성공 메시지
 */
export function showSuccess(message: string) {
  const successEl = document.createElement('div');
  successEl.textContent = message;
  successEl.style.color = 'var(--vscode-notificationsInfoIcon-foreground)';
  successEl.style.backgroundColor =
    'var(--vscode-inputValidation-infoBackground)';
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

/**
 * 로딩 상태 표시
 */
export function showLoading() {
  // 적용 버튼 비활성화
  const applyButtons: HTMLElement[] = Array.from(
    document.querySelectorAll('.apply-button, .suggestion-item')
  ) as HTMLElement[];

  applyButtons.forEach((btn: HTMLElement) => {
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
  if (modalBody) {
    modalBody.appendChild(loadingEl);
  }
}

/**
 * 로딩 상태 해제
 */
export function hideLoading() {
  // 로딩 메시지 제거
  const loadingMessage = document.querySelector('.loading-message');
  if (loadingMessage) {
    loadingMessage.remove();
  }

  // 버튼들 다시 활성화
  const applyButtons: HTMLElement[] = Array.from(
    document.querySelectorAll('.apply-button, .suggestion-item')
  ) as HTMLElement[];
  applyButtons.forEach((btn: HTMLElement) => {
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  });
}

/**
 * 모든 임시 메시지 제거
 */
export function clearAllMessages() {
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

// 모듈 내보내기
// window.FeedbackModule = {
//   showError,
//   showSuccess,
//   showLoading,
//   hideLoading,
//   clearAllMessages,
// };
