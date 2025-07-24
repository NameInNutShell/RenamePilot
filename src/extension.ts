import * as vscode from 'vscode';
import * as fs from 'fs';

import { ASTVariableAnalyzer } from './analyzer';
import { handleVariableRenaming } from './lib/ui';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "rename-pilot" is now active!');

  // 1. SidebarProvider 등록
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );

  // 2. 분석 후 Webview를 업데이트하는 로직
  const analyzeAndUpdate = (editor: vscode.TextEditor | undefined) => {
    if (!editor) {
      sidebarProvider.updateVariables([]);
      console.log('파일 없음');
      return;
    }
    const analyzer = new ASTVariableAnalyzer();
    console.log(editor.document.fileName);
    analyzer.createSourceFile(
      editor.document.fileName,
      editor.document.getText()
    );
    const variables = analyzer.collectVariableInfo();
    sidebarProvider.updateVariables(variables);
  };

  // 3. 확장 프로그램이 켜졌을 때와 에디터가 바뀔 때 분석 실행
  analyzeAndUpdate(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      analyzeAndUpdate(editor);
    })
  );
  
  // 4. 텍스트 변경 시에도 분석 실행 (디바운싱 적용)
  let timeout: NodeJS.Timeout | undefined = undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          analyzeAndUpdate(vscode.window.activeTextEditor);
        }, 1000); // 1초 디바운싱
      }
    })
  );
  
  // 5. 수동 새로고침 명령
  const refreshCommand = vscode.commands.registerCommand(
    'rename-pilot.refreshAnalysis',
    () => {
      analyzeAndUpdate(vscode.window.activeTextEditor);
    }
  );
  context.subscriptions.push(refreshCommand);

  // 6. 기존의 우클릭 메뉴 기능 (선택사항, 유지 가능)
  const recommendCommand = vscode.commands.registerCommand(
    'rename-pilot.recommend',
    async () => {
      console.log('=== RenamePilot Command Started ===');
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('분석할 파일이 열려있지 않습니다.');
        return;
      }

      const document = editor.document;
      const code = document.getText();
      const fileName = document.fileName;
      console.log('Processing file:', fileName);

      try {
        console.log('Creating analyzer...');
        const analyzer = new ASTVariableAnalyzer();
        console.log('Analyzer created successfully');

        console.log('Creating source file...');
        analyzer.createSourceFile(fileName, code);
        console.log('Source file created successfully');

        console.log('Collecting variable info...');
        const variables = analyzer.collectVariableInfo();
        console.log('Variables collected:', variables.length);

        if (variables.length === 0) {
          vscode.window.showInformationMessage('분석된 변수가 없습니다.');
          return;
        }

        // 변수명 추천 및 선택 처리
        await handleVariableRenaming(variables);
      } catch (error: unknown) {
        console.error('Error during analysis:', error);
        vscode.window.showErrorMessage(
          `변수 분석 중 오류가 발생했습니다: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      vscode.window.showInformationMessage(
        'RenamePilot 추천 기능이 실행되었습니다!'
      );
    }
  );

  context.subscriptions.push(recommendCommand);
}

export function deactivate() {}