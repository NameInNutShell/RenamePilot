// webview-ui/modules/validation.js
// 변수명 유효성 검사 관련 기능들

/**
 * 변수명이 유효한지 검사
 * @param {string} name - 검사할 변수명
 * @returns {boolean} 유효성 여부
 */
function isValidVariableName(name) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

/**
 * HTML 문자열 이스케이프
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 모듈 내보내기
window.ValidationModule = {
  isValidVariableName,
  escapeHtml
};