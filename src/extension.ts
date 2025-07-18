import * as vscode from 'vscode';
import { ASTVariableAnalyzer } from './analyzer';
import { handleVariableRenaming } from './lib/ui';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "rename-pilot" is now active!');

  const disposable = vscode.commands.registerCommand(
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

  context.subscriptions.push(disposable);
}

export function deactivate() {}
