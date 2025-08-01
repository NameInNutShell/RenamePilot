// webview-ui/main.js - 모듈화된 메인 파일
import * as VariableListModule from './modules/variableList';
(function () {
  const vscode = acquireVsCodeApi();
  let currentVariables = [];

  // 초기화
  function initialize() {
    setupEventListeners();
    setupModalEvents();
  }

  // 기본 이벤트 리스너 설정
  function setupEventListeners() {
    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'requestRefresh' });
      });
    }
  }

  // 모달 이벤트 설정
  function setupModalEvents() {
    if (window.ModalModule) {
      window.ModalModule.setupModalEventListeners(applyRename);
    }
  }

  // VSCode로 추천 요청
  function requestSuggestions(variable) {
    vscode.postMessage({
      command: 'getSuggestions',
      variable: variable,
    });
  }

  // 변수 클릭 핸들러
  function handleVariableClick(variable) {
    if (window.ModalModule) {
      window.ModalModule.showSuggestions(variable, requestSuggestions);
    }
  }

  // 변수명 변경 적용
  function applyRename(variable, newName) {
    console.log(`Applying rename: ${variable.name} -> ${newName}`);

    // 로딩 상태 표시
    if (window.FeedbackModule) {
      window.FeedbackModule.showLoading();
    }

    // VSCode로 변경 요청
    vscode.postMessage({
      command: 'renameVariable',
      variable: variable,
      newName: newName,
    });
  }

  // 변수 목록 업데이트
  function updateVariableList(variables) {
    currentVariables = variables;

    VariableListModule.updateVariableList(variables, handleVariableClick);
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
        if (window.ModalModule) {
          window.ModalModule.displaySuggestions(
            message.variableName,
            message.suggestions,
            applyRename
          );
        }
        break;

      case 'renameComplete':
        // 로딩 상태 해제
        if (window.FeedbackModule) {
          window.FeedbackModule.hideLoading();

          if (message.success) {
            window.FeedbackModule.showSuccess(
              `변수명이 "${message.oldName}"에서 "${message.newName}"으로 변경되었습니다.`
            );
            if (window.ModalModule) {
              window.ModalModule.closeModal();
            }
          } else {
            window.FeedbackModule.showError(
              message.error || '변수명 변경에 실패했습니다.'
            );
          }
        }
        break;
    }
  });

  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
