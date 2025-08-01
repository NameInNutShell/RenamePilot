import { updateVariableList } from './modules/variableList';
import * as ModalModule from './modules/modal';
import * as FeedbackModule from './modules/feedback';
import { VariableInfo, TreeNode } from '../types'; // ✨ 타입 정보 가져오기

// VS Code Webview API 타입 정의
// declare const vscode: {
//   postMessage(message: any): void;
// };

interface VsCodeApi {
  postMessage(message: any): void;
}
declare const acquireVsCodeApi: () => VsCodeApi;

console.log('[main.ts] 스크립트가 성공적으로 로드 및 실행되었습니다.');

// VS Code API를 가져옵니다.
const vscode = acquireVsCodeApi();

// "준비 완료" 신호를 보냅니다.
// vscode.postMessage({ command: 'ready' });

// --- 콜백 함수 정의 ---

function handleVariableClick(variable: TreeNode): void {
  ModalModule.showSuggestions(variable, requestSuggestions);
}

function applyRename(variable: TreeNode, newName: string): void {
  FeedbackModule.showLoading();
  vscode.postMessage({
    command: 'renameVariable',
    variable: variable,
    newName: newName,
  });
}

function requestSuggestions(variable: TreeNode): void {
  vscode.postMessage({
    command: 'getSuggestions',
    variable: variable,
  });
}

// --- VSCode로부터 메시지 수신 ---
window.addEventListener('message', (event) => {
  const message = event.data;
  console.log(message.command);
  switch (message.command) {
    case 'updateVariables':
      // ✨ message.variables가 TreeNode[] 타입임을 가정
      console.log('호출 전@');
      updateVariableList(message.variables, handleVariableClick);
      break;

    case 'showSuggestions':
      ModalModule.displaySuggestions(
        message.variableName,
        message.suggestions,
        applyRename
      );
      break;

    case 'renameComplete':
      FeedbackModule.hideLoading();
      if (message.success) {
        FeedbackModule.showSuccess(
          `변수명이 "${message.oldName}"에서 "${message.newName}"으로 변경되었습니다.`
        );
        ModalModule.closeModal();
        vscode.postMessage({ command: 'requestRefresh' });
      } else {
        FeedbackModule.showError(
          message.error || '변수명 변경에 실패했습니다.'
        );
      }
      break;
  }
});

// --- 초기화 ---
function initialize(): void {
  console.log('초기화!!!!!');
  const refreshButton = document.getElementById('refresh-button');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      vscode.postMessage({ command: 'requestRefresh' });
    });
  }
  ModalModule.setupModalEventListeners(applyRename);

  // 초기화가 끝났음을 알리는 메시지 전송; Race Condition 방지
  vscode.postMessage({ command: 'ready' });
}

initialize();
