// SidebarProvider.ts - 간소화된 버전
import * as vscode from 'vscode';
import * as fs from 'fs';
import {
  generateVariableNameSuggestions,
  generateAiSuggestions,
} from './lib/suggestions';
import { performVariableRename } from './lib/renamer';

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
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'src', 'webview-ui'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 캐시된 변수 정보 전송
    this.updateVariables(this._lastVariables);

    // 메시지 처리
    webviewView.webview.onDidReceiveMessage(async (data) => {
      await this._handleMessage(data);
    });
  }

  // 변수 정보 업데이트
  public updateVariables(variables: any[]) {
    this._lastVariables = variables;
    this._sendMessage({
      command: 'updateVariables',
      variables: variables,
    });
  }

  // 외부에서 변수 추천 모달 표시 (extension.ts에서 호출)
  public showVariableSuggestions(variable: any) {
    this._sendMessage({
      command: 'showVariableModal',
      variable: variable,
    });
  }

  // 메시지 처리 통합
  private async _handleMessage(data: any) {
    console.log(data);
    const variable = data.variable;
    const type = data.type; // 'rule' || 'ai'
    const apiKey = process.env.OPENAI_API_KEY || '';
    switch (data.command) {
      case 'getSuggestions':
        await this._handleGetSuggestions(variable, apiKey, type);
        break;

      case 'renameVariable':
        await this._handleRenameVariable(variable, data.newName);
        break;

      case 'requestRefresh':
        vscode.commands.executeCommand('rename-pilot.refreshAnalysis');
        break;
    }
  }

  // 추천 생성 처리
  private async _handleGetSuggestions(
    variable: any,
    apiKey: string,
    type: string
  ) {
    try {
      console.log(variable, ' 에 대한 추천 시작 : ', type);
      let suggestions = [];
      if (type === 'ai') {
        suggestions = await generateAiSuggestions(variable, apiKey); // 별도 AI 함수 호출
      } else {
        suggestions = generateVariableNameSuggestions(variable);
        console.log(suggestions);
      }
      console.log('suggestion 결과 : ', suggestions);
      this._sendMessage({
        command: 'showSuggestions',
        variableName: variable.name,
        suggestions: suggestions,
        type: type,
      });
    } catch (error) {
      console.error('추천 생성 오류:', error);
      this._sendMessage({
        command: 'showSuggestions',
        variableName: variable.name,
        suggestions: [],
        type: type,
      });
    }
  }

  // 변수명 변경 처리
  private async _handleRenameVariable(variable: any, newName: string) {
    try {
      console.log(`변수명 변경: "${variable.name}" -> "${newName}"`);
      const success = await performVariableRename(variable, newName);

      this._sendMessage({
        command: 'renameComplete',
        oldName: variable.name,
        newName: newName,
        success: success,
        error: success ? null : '변수명 변경에 실패했습니다.',
      });

      if (success) {
        // 성공 시 잠시 후 자동 새로고침
        setTimeout(() => {
          vscode.commands.executeCommand('rename-pilot.refreshAnalysis');
        }, 500);
      }
    } catch (error) {
      console.error('변수명 변경 오류:', error);
      this._sendMessage({
        command: 'renameComplete',
        oldName: variable.name,
        newName: newName,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '알 수 없는 오류가 발생했습니다.',
      });
    }
  }

  // 메시지 전송 헬퍼
  private _sendMessage(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  // HTML 생성
  private _getHtmlForWebview(webview: vscode.Webview): string {
    try {
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
    } catch (error) {
      console.error('HTML 로딩 오류:', error);
      return `
        <html>
        <body>
          <h1>RenamePilot</h1>
          <p>웹뷰 로딩 중 오류가 발생했습니다.</p>
          <p>오류: ${error}</p>
        </body>
        </html>
      `;
    }
  }
}
