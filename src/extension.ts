// extension.ts - 간소화된 버전
import * as vscode from 'vscode';
import { ASTVariableAnalyzer } from './analyzer';
import { SidebarProvider } from './SidebarProvider';

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export function activate(context: vscode.ExtensionContext) {
  console.log('RenamePilot 확장 프로그램이 활성화되었습니다!');

  // 사이드바 프로바이더 등록
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 변수 분석 및 업데이트 함수
  const analyzeAndUpdate = (editor: vscode.TextEditor | undefined) => {
    if (!editor) {
      sidebarProvider.updateVariables([]);
      return;
    }

    try {
      const analyzer = new ASTVariableAnalyzer(true); // VSCode 확장 모드
      analyzer.createSourceFile(
        editor.document.fileName,
        editor.document.getText()
      );
      const variables = analyzer.collectVariableInfo();
      sidebarProvider.updateVariables(variables);
    } catch (error) {
      console.error('변수 분석 중 오류:', error);
      sidebarProvider.updateVariables([]);
    }
  };

  // 초기 분석 실행
  analyzeAndUpdate(vscode.window.activeTextEditor);

  // 에디터 변경 시 분석
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(analyzeAndUpdate)
  );

  // 텍스트 변경 시 디바운싱된 분석 (1초 지연)
  let debounceTimeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          analyzeAndUpdate(vscode.window.activeTextEditor);
        }, 1000);
      }
    })
  );

  // 수동 새로고침 명령
  context.subscriptions.push(
    vscode.commands.registerCommand('rename-pilot.refreshAnalysis', () => {
      analyzeAndUpdate(vscode.window.activeTextEditor);
      vscode.window.showInformationMessage('변수 분석이 새로고침되었습니다.');
    })
  );

  // 기존 우클릭 메뉴 기능 (선택적 사용)
  context.subscriptions.push(
    vscode.commands.registerCommand('rename-pilot.recommend', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('분석할 파일이 열려있지 않습니다.');
        return;
      }

      try {
        const analyzer = new ASTVariableAnalyzer(true);
        analyzer.createSourceFile(
          editor.document.fileName,
          editor.document.getText()
        );
        const variables = analyzer.collectVariableInfo();

        if (variables.length === 0) {
          vscode.window.showInformationMessage('분석된 변수가 없습니다.');
          return;
        }

        // QuickPick으로 변수 선택 (기존 ui.ts 기능 통합)
        const variableOptions = variables.map((v) => ({
          label: `${v.name} (줄 ${v.location.line})`,
          description: v.type || 'unknown type',
          detail: `${v.kind} - ${v.scope}`,
          variable: v,
        }));

        const selected = await vscode.window.showQuickPick(variableOptions, {
          placeHolder: '이름을 바꿀 변수를 선택하세요',
        });

        if (selected) {
          // 사이드바를 통해 추천 모달 표시
          sidebarProvider.showVariableSuggestions(selected.variable);
        }
      } catch (error) {
        console.error('변수 분석 중 오류:', error);
        vscode.window.showErrorMessage(`분석 중 오류가 발생했습니다: ${error}`);
      }
    })
  );
}

export function deactivate() {
  console.log('RenamePilot 확장 프로그램이 비활성화되었습니다.');
}
