// src/lib/renamer.ts
import * as vscode from 'vscode';

// 실제 변수명 변경 수행
export async function performVariableRename(variable: any, newName: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const edit = new vscode.WorkspaceEdit();

  // This is a simplified rename. A real implementation would need to find all references.
  // For now, it only replaces the original declaration.
  const position = new vscode.Position(
    variable.location.line - 1,
    variable.location.column
  );
  const range = new vscode.Range(
    position,
    position.translate(0, variable.name.length)
  );

  edit.replace(document.uri, range, newName);

  const success = await vscode.workspace.applyEdit(edit);

  if (success) {
    vscode.window.showInformationMessage(
      `변수명이 "${variable.name}"에서 "${newName}"으로 변경되었습니다.`
    );
  } else {
    vscode.window.showErrorMessage('변수명 변경에 실패했습니다.');
  }
}
