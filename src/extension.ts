import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ASTVariableAnalyzer } from './analyzer';
import { handleVariableRenaming } from './lib/ui';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "rename-pilot" is now active!');

  // 마지막으로 활성화되었던 에디터를 저장할 변수
  let lastActiveEditor: vscode.TextEditor | undefined =
    vscode.window.activeTextEditor;

  // 활성화된 에디터가 바뀔 때마다 변수를 업데이트
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      lastActiveEditor = editor;
      if (editor) {
        console.log(`Active editor changed to: ${editor.document.fileName}`);
      }
    })
  );

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

  // 2. Webview UI를 여는 새로운 명령어
  const showUICommand = vscode.commands.registerCommand(
    'rename-pilot.showUI',
    () => {
      const panel = vscode.window.createWebviewPanel(
        'renamePilotUI',
        'RenamePilot 분석기',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, 'src', 'webview-ui'),
          ],
        }
      );

      // Webview에 HTML 콘텐츠 설정
      panel.webview.html = getWebviewContent(context, panel.webview);

      // Webview로부터 메시지를 받을 리스너 설정
      // ✨ 함수로 분리하여 재사용성 높이기
      const analyzeAndUpdateWebview = (
        editor: vscode.TextEditor | undefined
      ) => {
        if (!editor) {
          vscode.window.showErrorMessage(
            '분석할 파일이 없습니다. 코드 파일을 먼저 클릭해주세요.'
          );
          return;
        }
        const document = editor.document;
        const analyzer = new ASTVariableAnalyzer();
        analyzer.createSourceFile(document.fileName, document.getText());
        const variables = analyzer.collectVariableInfo();
        panel.webview.postMessage({
          command: 'updateVariables',
          variables: variables,
        });
      };

      // ✨ Webview가 로드되면, 마지막으로 활성화됐던 에디터를 기준으로 즉시 분석 실행
      analyzeAndUpdateWebview(lastActiveEditor);

      // Webview로부터 메시지를 받을 리스너 설정
      panel.webview.onDidReceiveMessage(
        (message) => {
          if (message.command === 'analyze') {
            // ✨ 버튼 클릭 시에도 마지막 활성 에디터 기준으로 새로고침
            analyzeAndUpdateWebview(lastActiveEditor);
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(recommendCommand, showUICommand);

  // context.subscriptions.push(disposable);
}

// ✨ Webview에 들어갈 HTML을 생성하고 리소스 경로를 처리하는 헬퍼 함수
function getWebviewContent(
  context: vscode.ExtensionContext,
  webview: vscode.Webview
): string {
  const webviewUiPath = vscode.Uri.joinPath(
    context.extensionUri,
    'src',
    'webview-ui'
  );

  const htmlPath = vscode.Uri.joinPath(webviewUiPath, 'index.html');
  const stylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewUiPath, 'styles.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(webviewUiPath, 'main.js')
  );

  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
  html = html.replace('${stylesUri}', stylesUri.toString());
  html = html.replace('${scriptUri}', scriptUri.toString());

  return html;
}

export function deactivate() {}
