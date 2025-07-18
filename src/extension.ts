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
    // console.log('2번 ㄱㄱㄱ');
    if (!editor) {
      sidebarProvider.updateVariables([]); // 파일이 없으면 빈 배열 전달
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
    sidebarProvider.updateVariables(variables); // Provider를 통해 Webview 업데이트
  };

  // 3. 확장 프로그램이 켜졌을 때와 에디터가 바뀔 때 분석 실행
  analyzeAndUpdate(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      analyzeAndUpdate(editor);
    })
  );

  // 4. 기존의 우클릭 메뉴 기능 (선택사항, 유지 가능)
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
        // 2. 분석기 인스턴스 생성
        const analyzer = new ASTVariableAnalyzer();
        console.log('Analyzer created successfully');

        console.log('Creating source file...');

        // 3. 파일 내용으로 소스 파일을 직접 생성해 분석
        analyzer.createSourceFile(fileName, code);
        console.log('Source file created successfully');

        console.log('Collecting variable info...');

        // 4. 변수 정보를 수집하고 사용자에게 보여준다.
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

  // context.subscriptions.push(disposable);
}

export function deactivate() {}
