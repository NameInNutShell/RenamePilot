// src/lib/renamer.ts - VSCode RenameProvider를 활용한 개선된 구현
import * as vscode from 'vscode';
import * as ts from 'typescript';

/**
 * VSCode의 RenameProvider를 활용한 변수명 일괄 변경 기능
 * 기존 단순 문자열 교체 방식을 개선하여 정확한 변수명 변경을 제공
 */
class VariableRenameProvider {
  
  /**
   * 특정 변수의 모든 참조를 찾아서 새 이름으로 일괄 변경
   * @param variable 변경할 변수 정보
   * @param newName 새로운 변수명
   * @returns 변경 성공 여부
   */
  async renameVariable(variable: any, newName: string): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('활성화된 편집기가 없습니다.');
      return false;
    }

    try {
      // 1. 변수의 정확한 위치 찾기
      const position = await this.findVariablePosition(editor, variable);
      if (!position) {
        vscode.window.showErrorMessage('변수 위치를 찾을 수 없습니다.');
        return false;
      }

      // 2. 커서를 해당 위치로 이동
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));

      // 3. VSCode의 내장 rename 기능 사용
      const success = await this.executeRename(newName);
      
      if (success) {
        vscode.window.showInformationMessage(
          `변수명이 "${variable.name}"에서 "${newName}"으로 변경되었습니다.`
        );
        return true;
      } else {
        // 4. 내장 기능 실패 시 폴백: 스코프 기반 수동 변경
        return await this.fallbackRename(editor, variable, newName);
      }

    } catch (error) {
      console.error('Rename error:', error);
      return await this.fallbackRename(editor, variable, newName);
    }
  }

  /**
   * 변수의 정확한 위치를 찾는 함수
   */
  private async findVariablePosition(
    editor: vscode.TextEditor, 
    variable: any
  ): Promise<vscode.Position | null> {
    const document = editor.document;
    const targetLine = variable.location.line - 1; // 0-based index
    
    if (targetLine < 0 || targetLine >= document.lineCount) {
      return null;
    }

    const lineText = document.lineAt(targetLine).text;
    const variableName = variable.name;
    
    // 변수명이 정확히 매치되는 위치 찾기 (단어 경계 고려)
    const regex = new RegExp(`\\b${this.escapeRegExp(variableName)}\\b`, 'g');
    let match;
    
    while ((match = regex.exec(lineText)) !== null) {
      const position = new vscode.Position(targetLine, match.index);
      
      // TypeScript 언어 서버를 통해 실제로 해당 위치가 변수인지 확인
      if (await this.isVariableAtPosition(document, position)) {
        return position;
      }
    }

    // 정확한 위치를 찾지 못했을 경우 원래 column 사용
    return new vscode.Position(targetLine, variable.location.column);
  }

  /**
   * 특정 위치에 변수가 있는지 확인
   */
  private async isVariableAtPosition(
    document: vscode.TextDocument, 
    position: vscode.Position
  ): Promise<boolean> {
    try {
      // VSCode의 hover 기능을 사용해서 해당 위치의 정보 확인
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        document.uri,
        position
      );
      
      return hovers && hovers.length > 0;
    } catch {
      return true; // 확인할 수 없으면 true로 가정
    }
  }

  /**
   * VSCode의 내장 rename 기능 실행
   */
  private async executeRename(newName: string): Promise<boolean> {
    try {
      // prepareRename으로 rename 가능한지 먼저 확인
      const editor = vscode.window.activeTextEditor;
      if (!editor) return false;

      const prepareResult = await vscode.commands.executeCommand<vscode.Range | { range: vscode.Range; placeholder: string }>(
        'vscode.prepareRename',
        editor.document.uri,
        editor.selection.active
      );

      if (!prepareResult) {
        console.log('prepareRename failed - not renameable');
        return false;
      }

      // WorkspaceEdit을 생성하는 rename provider 호출
      const workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
        'vscode.executeDocumentRenameProvider',
        editor.document.uri,
        editor.selection.active,
        newName
      );

      if (!workspaceEdit) {
        console.log('No WorkspaceEdit returned from rename provider');
        return false;
      }

      // WorkspaceEdit 적용
      const success = await vscode.workspace.applyEdit(workspaceEdit);
      return success;

    } catch (error) {
      console.error('Execute rename failed:', error);
      return false;
    }
  }

  /**
   * 폴백: 스코프 기반 수동 변수명 변경
   * VSCode 내장 기능이 실패했을 때 사용
   */
  private async fallbackRename(
    editor: vscode.TextEditor,
    variable: any,
    newName: string
  ): Promise<boolean> {
    try {
      console.log('Using fallback rename method');
      
      const document = editor.document;
      const text = document.getText();
      const variableName = variable.name;
      
      // TypeScript로 파싱해서 변수의 스코프 찾기
      const sourceFile = ts.createSourceFile(
        document.fileName,
        text,
        ts.ScriptTarget.Latest,
        true
      );

      const edits = this.findVariableReferencesInScope(
        sourceFile, 
        variableName, 
        variable, 
        newName
      );

      if (edits.length === 0) {
        vscode.window.showWarningMessage('변경할 변수 참조를 찾을 수 없습니다.');
        return false;
      }

      // WorkspaceEdit 생성 및 적용
      const workspaceEdit = new vscode.WorkspaceEdit();
      edits.forEach(edit => {
        workspaceEdit.replace(document.uri, edit.range, edit.newText);
      });

      const success = await vscode.workspace.applyEdit(workspaceEdit);
      
      if (success) {
        vscode.window.showInformationMessage(
          `${edits.length}개의 "${variableName}" 참조가 "${newName}"으로 변경되었습니다.`
        );
      } else {
        vscode.window.showErrorMessage('변수명 변경에 실패했습니다.');
      }

      return success;

    } catch (error) {
      console.error('Fallback rename failed:', error);
      vscode.window.showErrorMessage(`변수명 변경 중 오류가 발생했습니다: ${error}`);
      return false;
    }
  }

  /**
   * TypeScript AST를 사용해서 스코프 내의 변수 참조 찾기
   */
  private findVariableReferencesInScope(
    sourceFile: ts.SourceFile,
    variableName: string,
    variable: any,
    newName: string
  ): Array<{ range: vscode.Range; newText: string }> {
    const edits: Array<{ range: vscode.Range; newText: string }> = [];
    const targetLine = variable.location.line - 1;
    
    // 변수가 선언된 스코프 찾기
    const declarationScope = this.findDeclarationScope(sourceFile, variableName, targetLine);
    
    if (!declarationScope) {
      console.log('Declaration scope not found');
      return edits;
    }

    // 해당 스코프 내에서 변수명 찾기
    const findReferences = (node: ts.Node) => {
      if (ts.isIdentifier(node) && node.text === variableName) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        
        // 스코프 내부인지 확인
        if (this.isWithinScope(node, declarationScope)) {
          const range = new vscode.Range(
            new vscode.Position(start.line, start.character),
            new vscode.Position(end.line, end.character)
          );
          edits.push({ range, newText: newName });
        }
      }
      
      ts.forEachChild(node, findReferences);
    };

    findReferences(sourceFile);
    return edits;
  }

  /**
   * 변수가 선언된 스코프 찾기
   */
  private findDeclarationScope(
    sourceFile: ts.SourceFile, 
    variableName: string, 
    targetLine: number
  ): ts.Node | null {
    let foundScope: ts.Node | null = null;

    const findScope = (node: ts.Node) => {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      
      // 해당 라인이 이 노드 범위 내에 있는지 확인
      if (start.line <= targetLine && targetLine <= end.line) {
        // 스코프가 될 수 있는 노드들
        if (ts.isFunctionDeclaration(node) || 
            ts.isArrowFunction(node) || 
            ts.isMethodDeclaration(node) ||
            ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isBlock(node) ||
            ts.isCatchClause(node)) {
          foundScope = node;
        }
        
        ts.forEachChild(node, findScope);
      }
    };

    findScope(sourceFile);
    return foundScope || sourceFile; // 스코프를 찾지 못하면 전체 파일 사용
  }

  /**
   * 노드가 특정 스코프 내부에 있는지 확인
   */
  private isWithinScope(node: ts.Node, scope: ts.Node): boolean {
    let current = node.parent;
    while (current) {
      if (current === scope) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * 정규식 특수문자 이스케이프
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// 싱글톤 인스턴스
const variableRenamer = new VariableRenameProvider();

/**
 * 실제 변수명 변경 수행 - VSCode의 내장 rename 기능 활용
 * 기존 함수 시그니처를 유지하여 호환성 보장
 */
export async function performVariableRename(variable: any, newName: string): Promise<boolean> {
  return await variableRenamer.renameVariable(variable, newName);
}