import * as vscode from 'vscode';
import { ASTVariableAnalyzer } from './analyzer';

// 변수명 추천 함수
function generateVariableNameSuggestions(variable: any): string[] {
  const suggestions: string[] = [];
  const originalName = variable.name;
  
  // 1. 의미있는 이름 생성 규칙
  const meaningfulNames = generateMeaningfulNames(variable);
  suggestions.push(...meaningfulNames);
  
  // 2. 타입 기반 이름 생성
  const typeBasedNames = generateTypeBasedNames(variable);
  suggestions.push(...typeBasedNames);
  
  // 3. 컨텍스트 기반 이름 생성
  const contextBasedNames = generateContextBasedNames(variable);
  suggestions.push(...contextBasedNames);
  
  // 4. 중복 제거 및 원본 이름 제외
  const uniqueSuggestions = [...new Set(suggestions)]
    .filter(name => name !== originalName)
    .slice(0, 5); // 최대 5개 추천
  
  return uniqueSuggestions;
}

// 의미있는 이름 생성
function generateMeaningfulNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  
  // 축약어를 풀어서 작성
  const abbreviationMap: { [key: string]: string } = {
    'btn': 'button',
    'img': 'image',
    'str': 'string',
    'num': 'number',
    'arr': 'array',
    'obj': 'object',
    'fn': 'function',
    'tmp': 'temporary',
    'cnt': 'count',
    'idx': 'index',
    'len': 'length',
    'val': 'value',
    'res': 'result',
    'req': 'request',
    'resp': 'response',
    'cfg': 'config',
    'ctx': 'context',
    'elem': 'element',
    'attr': 'attribute',
    'prop': 'property'
  };
  
  // 축약어 변환
  for (const [abbr, full] of Object.entries(abbreviationMap)) {
    if (originalName.toLowerCase().includes(abbr)) {
      const newName = originalName.replace(new RegExp(abbr, 'gi'), full);
      names.push(newName);
    }
  }
  
  // 단수/복수 구분
  if (variable.type?.includes('[]') || variable.type?.includes('Array')) {
    if (!originalName.endsWith('s') && !originalName.endsWith('List')) {
      names.push(originalName + 's');
      names.push(originalName + 'List');
    }
  }
  
  return names;
}

// 타입 기반 이름 생성
function generateTypeBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  const type = variable.type;
  
  if (type) {
    // boolean 타입의 경우 is, has, can 등의 접두사 추가
    if (type === 'boolean') {
      const booleanPrefixes = ['is', 'has', 'can', 'should', 'will'];
      booleanPrefixes.forEach(prefix => {
        const capitalizedName = originalName.charAt(0).toUpperCase() + originalName.slice(1);
        names.push(prefix + capitalizedName);
      });
    }
    
    // 함수 타입의 경우 동사 형태 추천
    if (type.includes('function') || type.includes('=>')) {
      const verbPrefixes = ['handle', 'process', 'execute', 'perform', 'run'];
      verbPrefixes.forEach(prefix => {
        const capitalizedName = originalName.charAt(0).toUpperCase() + originalName.slice(1);
        names.push(prefix + capitalizedName);
      });
    }
    
    // 배열 타입의 경우 복수형 추천
    if (type.includes('[]') || type.includes('Array')) {
      if (!originalName.endsWith('s')) {
        names.push(originalName + 's');
        names.push(originalName + 'List');
        names.push(originalName + 'Array');
      }
    }
  }
  
  return names;
}

// 컨텍스트 기반 이름 생성
function generateContextBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  
  // 변수의 위치나 용도에 따른 이름 생성
  if (variable.location) {
    // 루프 변수인 경우
    if (originalName === 'i' || originalName === 'j' || originalName === 'k') {
      names.push('index', 'currentIndex', 'position', 'counter');
    }
    
    // 임시 변수인 경우
    if (originalName.startsWith('temp') || originalName.startsWith('tmp')) {
      names.push('temporary' + originalName.replace(/^(temp|tmp)/i, ''));
    }
  }
  
  return names;
}

// 변수명 추천 및 선택 처리
async function handleVariableRenaming(variables: any[]) {
  const variableOptions = variables.map((v, index) => ({
    label: `${v.name} (line ${v.location.line})`,
    description: v.type || 'unknown type',
    detail: `Click to see rename suggestions`,
    variable: v,
    index: index
  }));

  const selectedVariable = await vscode.window.showQuickPick(variableOptions, {
    placeHolder: '이름을 바꿀 변수를 선택하세요',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (selectedVariable) {
    const suggestions = generateVariableNameSuggestions(selectedVariable.variable);
    
    if (suggestions.length === 0) {
      vscode.window.showInformationMessage('추천할 변수명이 없습니다.');
      return;
    }

    const suggestionOptions = suggestions.map(suggestion => ({
      label: suggestion,
      description: `Rename "${selectedVariable.variable.name}" to "${suggestion}"`
    }));

    // 직접 입력 옵션 추가
    suggestionOptions.push({
      label: '$(edit) 직접 입력...',
      description: '원하는 변수명을 직접 입력합니다'
    });

    const selectedSuggestion = await vscode.window.showQuickPick(suggestionOptions, {
      placeHolder: `"${selectedVariable.variable.name}"의 새로운 이름을 선택하세요`,
      matchOnDescription: true
    });

    if (selectedSuggestion) {
      let newName = selectedSuggestion.label;
      
      // 직접 입력 옵션이 선택된 경우
      if (newName === '$(edit) 직접 입력...') {
        const inputName = await vscode.window.showInputBox({
          prompt: `"${selectedVariable.variable.name}"의 새로운 이름을 입력하세요`,
          value: selectedVariable.variable.name,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return '변수명을 입력해주세요';
            }
            if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
              return '올바른 변수명 형식이 아닙니다';
            }
            return null;
          }
        });
        
        if (inputName) {
          newName = inputName;
        } else {
          return;
        }
      }

      // 실제 변수명 변경 수행
      await performVariableRename(selectedVariable.variable, newName);
    }
  }
}

// 실제 변수명 변경 수행
async function performVariableRename(variable: any, newName: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const edit = new vscode.WorkspaceEdit();
  
  // 해당 변수의 모든 사용처를 찾아서 변경
  const position = new vscode.Position(variable.location.line - 1, variable.location.column);
  const range = new vscode.Range(position, position.translate(0, variable.name.length));
  
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
        // // 3. 파일 내용으로 소스 파일을 직접 생성해 분석
        analyzer.createSourceFile(fileName, code);
        console.log('Source file created successfully');

        console.log('Collecting variable info...');
        // // 4. 변수 정보를 수집하고 사용자에게 보여준다.
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