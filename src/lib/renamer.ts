// src/lib/renamer.ts
import * as vscode from 'vscode';

// 실제 변수명 변경 수행 - VSCode의 내장 rename 기능 활용
export async function performVariableRename(variable: any, newName: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('활성화된 편집기가 없습니다.');
    return;
  }

  try {
    // 변수 위치로 커서 이동
    const position = new vscode.Position(
      variable.location.line - 1,
      variable.location.column
    );
    
    editor.selection = new vscode.Selection(position, position);
    
    // VSCode의 내장 rename 기능 사용 (F2)
    // 이렇게 하면 모든 참조도 함께 변경됨
    await vscode.commands.executeCommand('editor.action.rename', {
      newName: newName
    });
    
    vscode.window.showInformationMessage(
      `변수명이 "${variable.name}"에서 "${newName}"으로 변경되었습니다.`
    );
    
    return true;
  } catch (error) {
    console.error('Rename error:', error);
    
    // 폴백: 수동으로 현재 위치만 변경
    try {
      const edit = new vscode.WorkspaceEdit();
      const position = new vscode.Position(
        variable.location.line - 1,
        variable.location.column
      );
      const range = new vscode.Range(
        position,
        position.translate(0, variable.name.length)
      );
      
      edit.replace(editor.document.uri, range, newName);
      const success = await vscode.workspace.applyEdit(edit);
      
      if (success) {
        vscode.window.showWarningMessage(
          `변수명이 "${variable.name}"에서 "${newName}"으로 변경되었습니다. (현재 위치만 변경됨)`
        );
        return true;
      } else {
        vscode.window.showErrorMessage('변수명 변경에 실패했습니다.');
        return false;
      }
    } catch (fallbackError) {
      vscode.window.showErrorMessage('변수명 변경에 실패했습니다.');
      return false;
    }
  }
}