// src/lib/suggestions.ts

// (You'll need to define the 'variable' type, perhaps in a shared types.ts file)
// For now, we'll use 'any' as in your original code.

// 의미있는 이름 생성
function generateMeaningfulNames(variable: any): string[] {
  const names: string[] = [];   
  const originalName = variable.name;
  
  const abbreviationMap: { [key: string]: string } = {
    'btn': 'button', 'img': 'image', 'str': 'string', 'num': 'number',
    'arr': 'array', 'obj': 'object', 'fn': 'function', 'tmp': 'temporary',
    'cnt': 'count', 'idx': 'index', 'len': 'length', 'val': 'value',
    'res': 'result', 'req': 'request', 'resp': 'response', 'cfg': 'config',
    'ctx': 'context', 'elem': 'element', 'attr': 'attribute', 'prop': 'property'
  };
  
  for (const [abbr, full] of Object.entries(abbreviationMap)) {
    if (originalName.toLowerCase().includes(abbr)) {
      names.push(originalName.replace(new RegExp(abbr, 'gi'), full));
    }
  }
  
  if (variable.type?.includes('[]') || variable.type?.includes('Array')) {
    if (!originalName.endsWith('s') && !originalName.endsWith('List')) {
      names.push(originalName + 's', originalName + 'List');
    }
  }
  
  return names;
}

// 타입 기반 이름 생성
function generateTypeBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  const type = variable.type;
  
  if (!type) return names;

  if (type === 'boolean') {
    ['is', 'has', 'can', 'should', 'will'].forEach(prefix => {
      const capitalizedName = originalName.charAt(0).toUpperCase() + originalName.slice(1);
      names.push(prefix + capitalizedName);
    });
  }
  
  if (type.includes('function') || type.includes('=>')) {
    ['handle', 'process', 'execute', 'perform', 'run'].forEach(prefix => {
      const capitalizedName = originalName.charAt(0).toUpperCase() + originalName.slice(1);
      names.push(prefix + capitalizedName);
    });
  }
  
  if (type.includes('[]') || type.includes('Array')) {
    if (!originalName.endsWith('s')) {
      names.push(originalName + 's', originalName + 'List', originalName + 'Array');
    }
  }
  
  return names;
}

// 컨텍스트 기반 이름 생성
function generateContextBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  
  if (variable.location) {
    if (['i', 'j', 'k'].includes(originalName)) {
      names.push('index', 'currentIndex', 'position', 'counter');
    }
    
    if (originalName.startsWith('temp') || originalName.startsWith('tmp')) {
      names.push('temporary' + originalName.replace(/^(temp|tmp)/i, ''));
    }
  }
  
  return names;
}

// Main suggestion generation function
export function generateVariableNameSuggestions(variable: any): string[] {
  const originalName = variable.name;
  const suggestions = [
    ...generateMeaningfulNames(variable),
    ...generateTypeBasedNames(variable),
    ...generateContextBasedNames(variable)
  ];
  
  return [...new Set(suggestions)]
    .filter(name => name !== originalName)
    .slice(0, 5); // Max 5 suggestions
}
