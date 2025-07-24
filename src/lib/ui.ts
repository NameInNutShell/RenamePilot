// src/lib/ui.ts
import * as vscode from 'vscode';
import { generateVariableNameSuggestions } from './suggestions';
import { performVariableRename } from './renamer';

// 변수명 추천 및 선택 처리
export async function handleVariableRenaming(variables: any[]) {
  const variableOptions = variables.map((v) => ({
    label: `${v.name} (line ${v.location.line})`,
    description: v.type || 'unknown type',
    detail: `Click to see rename suggestions`,
    variable: v,
  }));

  const selectedVariableItem = await vscode.window.showQuickPick(
    variableOptions,
    {
      placeHolder: '이름을 바꿀 변수를 선택하세요',
    }
  );

  if (!selectedVariableItem) return;

  const selectedVariable = selectedVariableItem.variable;
  const suggestions = generateVariableNameSuggestions(selectedVariable);

  if (suggestions.length === 0) {
    vscode.window.showInformationMessage('추천할 변수명이 없습니다.');
    return;
  }

  const suggestionOptions = suggestions.map((suggestion) => ({
    label: suggestion,
    description: `Rename "${selectedVariable.name}" to "${suggestion}"`,
  }));

  suggestionOptions.push({
    label: '$(edit) 직접 입력...',
    description: '원하는 변수명을 직접 입력합니다',
  });

  const selectedSuggestion = await vscode.window.showQuickPick(
    suggestionOptions,
    {
      placeHolder: `"${selectedVariable.name}"의 새로운 이름을 선택하세요`,
    }
  );

  if (!selectedSuggestion) return;

  let newName = selectedSuggestion.label;

  if (newName === '$(edit) 직접 입력...') {
    const inputName = await vscode.window.showInputBox({
      prompt: `"${selectedVariable.name}"의 새로운 이름을 입력하세요`,
      value: selectedVariable.name,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) return '변수명을 입력해주세요';
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value))
          return '올바른 변수명 형식이 아닙니다';
        return null;
      },
    });

    if (inputName) {
      newName = inputName;
    } else {
      return; // User cancelled the input box
    }
  }

  await performVariableRename(selectedVariable, newName);
}
