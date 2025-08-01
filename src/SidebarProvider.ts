// SidebarProvider.ts - 에러 처리가 개선된 완성 버전
import * as vscode from 'vscode';
import * as fs from 'fs';
import { generateVariableNameSuggestions } from './lib/suggestions';
import { performVariableRename } from './lib/renamer'; // 개선된 rename 기능 사용
import { VariableInfo } from './types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'renamepilot-view';
  private _view?: vscode.WebviewView;
  private _lastVariables: any[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Webview로부터 메시지 수신
    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log(data.command);
      switch (data.command) {
        // ready 신호 받으면 -> 캐시된 변수 정보 데이터를 전송
        case 'ready':
          // this.updateVariables(this._lastVariables);
          console.log('준비완료');
          this._view?.webview.postMessage({
            command: 'updateVariables',
            variables: this._lastVariables,
          });
          break;
        case 'getSuggestions':
          // 변수에 대한 이름 추천 생성
          const variable = data.variable;
          const suggestions = generateVariableNameSuggestions(variable);

          // 추천된 이름들을 웹뷰로 전송
          this._view?.webview.postMessage({
            command: 'showSuggestions',
            variableName: variable.name,
            suggestions: suggestions,
          });
          break;

        case 'renameVariable':
          try {
            // 개선된 변수명 변경 기능 사용
            console.log(
              `Renaming variable "${data.variable.name}" to "${data.newName}"`
            );
            const success = await performVariableRename(
              data.variable,
              data.newName
            );

            if (success) {
              // 변경 완료 메시지 전송
              this._view?.webview.postMessage({
                command: 'renameComplete',
                oldName: data.variable.name,
                newName: data.newName,
                success: true,
              });

              // 잠시 후 자동으로 새로고침하여 변경된 내용 반영
              setTimeout(() => {
                vscode.commands.executeCommand('rename-pilot.refreshAnalysis');
              }, 500);
            } else {
              // 실패 메시지 전송
              this._view?.webview.postMessage({
                command: 'renameComplete',
                oldName: data.variable.name,
                newName: data.newName,
                success: false,
                error: '변수명 변경에 실패했습니다.',
              });
            }
          } catch (error) {
            console.error('Rename error in SidebarProvider:', error);
            this._view?.webview.postMessage({
              command: 'renameComplete',
              oldName: data.variable.name,
              newName: data.newName,
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : '알 수 없는 오류가 발생했습니다.',
            });
          }
          break;

        case 'requestRefresh':
          // 현재 에디터의 변수 정보 재분석 요청
          vscode.commands.executeCommand('rename-pilot.refreshAnalysis');
          break;
      }
    });
  }

  // Webview로 데이터 전송하는 함수
  public updateVariables(variables: VariableInfo[]) {
    this._lastVariables = variables;

    if (this._view) {
      console.log('[Provider] Webview로 updateVariables 메시지를 보냅니다.');
      this._view.webview.postMessage({
        command: 'updateVariables',
        variables: variables,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // HTML, CSS 경로는 원본('src') 위치를 사용
    const webviewUiPath = vscode.Uri.joinPath(
      this._extensionUri,
      'src',
      'webview-ui'
    );
    const htmlPath = vscode.Uri.joinPath(webviewUiPath, 'index.html');
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewUiPath, 'styles.css')
    );

    // ✨ JavaScript 파일의 경로는 반드시 컴파일된 'out' 폴더를 가리켜야 합니다.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview-ui', 'main.js')
    );

    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    html = html.replace(/\${stylesUri}/g, stylesUri.toString());
    html = html.replace(/\${scriptUri}/g, scriptUri.toString());

    return html;
  }
}
