import * as vscode from 'vscode';
import * as fs from 'fs';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'renamepilot-view';
  private _view?: vscode.WebviewView;
  private _lastVariables: any[] = []; // ✨ 1. 변수를 캐싱할 변수 추가

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'src', 'webview-ui'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // ✨ 3. 뷰가 생성(resolve)되면, 캐시된 마지막 변수 정보를 즉시 전송
    this.updateVariables(this._lastVariables);

    // Webview로부터 메시지 수신
    webviewView.webview.onDidReceiveMessage((data) => {
      // 필요하다면 이곳에서 extension.ts와 통신
      switch (data.command) {
        case 'button-clicked':
          vscode.window.showInformationMessage('Webview button was clicked!');
          break;
      }
    });
  }

  // Webview로 데이터 전송하는 함수
  public updateVariables(variables: any[]) {
    // ✨ 2. 항상 최신 변수 정보를 내부 변수에 캐싱
    this._lastVariables = variables;

    // 뷰가 준비되었다면, Webview로 데이터 전송
    if (this._view) {
      this._view.webview.postMessage({
        command: 'updateVariables',
        variables: variables,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const webviewUiPath = vscode.Uri.joinPath(
      this._extensionUri,
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
    html = html.replace(/\${stylesUri}/g, stylesUri.toString());
    html = html.replace(/\${scriptUri}/g, scriptUri.toString());

    return html;
  }
}
