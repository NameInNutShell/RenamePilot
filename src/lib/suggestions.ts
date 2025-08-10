// src/lib/suggestions.ts
import OpenAI from 'openai';
import { VariableInfo } from '../types';
// 의미있는 이름 생성
function generateMeaningfulNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name.toLowerCase();

  const abbreviationMap: { [key: string]: string[] } = {
    btn: ['button', 'actionButton'],
    img: ['image', 'imageElement'],
    str: ['string', 'textString'],
    num: ['number', 'numericValue'],
    arr: ['array', 'arrayList'],
    obj: ['object', 'dataObject'],
    fn: ['function', 'callback'],
    func: ['function', 'handler'],
    tmp: ['temporary', 'tempValue'],
    temp: ['temporary', 'temporaryData'],
    cnt: ['count', 'counter'],
    idx: ['index', 'currentIndex'],
    len: ['length', 'totalLength'],
    val: ['value', 'currentValue'],
    res: ['result', 'response'],
    req: ['request', 'requestData'],
    resp: ['response', 'responseData'],
    cfg: ['config', 'configuration'],
    ctx: ['context', 'executionContext'],
    elem: ['element', 'domElement'],
    attr: ['attribute', 'elementAttribute'],
    prop: ['property', 'propertyValue'],
    msg: ['message', 'messageText'],
    err: ['error', 'errorMessage'],
    cb: ['callback', 'callbackFunction'],
    opts: ['options', 'configOptions'],
    args: ['arguments', 'functionArguments'],
    params: ['parameters', 'functionParameters'],
    ret: ['return', 'returnValue'],
    bool: ['boolean', 'booleanFlag'],
    char: ['character', 'charValue'],
    src: ['source', 'sourceData'],
    dest: ['destination', 'targetDestination'],
    prev: ['previous', 'previousValue'],
    curr: ['current', 'currentValue'],
    max: ['maximum', 'maxValue'],
    min: ['minimum', 'minValue'],
  };

  // 약어 확장
  for (const [abbr, expansions] of Object.entries(abbreviationMap)) {
    if (originalName.includes(abbr)) {
      for (const expansion of expansions) {
        const newName = variable.name.replace(
          new RegExp(abbr, 'gi'),
          expansion
        );
        if (newName !== variable.name) {
          names.push(newName);
          // camelCase 버전도 추가
          const camelCased = newName.charAt(0).toLowerCase() + newName.slice(1);
          if (camelCased !== newName) {
            names.push(camelCased);
          }
        }
      }
    }
  }

  // 단수/복수 처리
  if (variable.type?.includes('[]') || variable.type?.includes('Array')) {
    if (
      !originalName.endsWith('s') &&
      !originalName.endsWith('list') &&
      !originalName.endsWith('array')
    ) {
      names.push(variable.name + 's');
      names.push(variable.name + 'List');
      names.push(variable.name + 'Array');
    }
  }

  // 일반적인 개선
  if (['i', 'j', 'k'].includes(variable.name)) {
    names.push('index', 'counter', 'iterator', 'position');
  }

  return names;
}

// 타입 기반 이름 생성
function generateTypeBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  const type = variable.type?.toLowerCase() || '';

  // Boolean 타입
  if (type.includes('boolean') || type === 'bool') {
    const prefixes = ['is', 'has', 'can', 'should', 'will', 'did', 'was'];
    const baseName = originalName.replace(
      /^(is|has|can|should|will|did|was)/i,
      ''
    );

    prefixes.forEach((prefix) => {
      const capitalizedBase =
        baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const suggestion = prefix + capitalizedBase;
      if (suggestion !== originalName) {
        names.push(suggestion);
      }
    });

    // 특정 패턴에 대한 제안
    if (originalName.includes('flag')) {
      names.push(originalName.replace('flag', 'Enabled'));
      names.push(originalName.replace('flag', 'Active'));
    }
  }

  // Function 타입
  if (
    type.includes('function') ||
    type.includes('=>') ||
    (variable.kind === 'parameter' && type.includes('('))
  ) {
    const prefixes = [
      'handle',
      'process',
      'execute',
      'perform',
      'run',
      'get',
      'set',
      'create',
      'update',
      'delete',
    ];
    const baseName = originalName.replace(
      /^(handle|process|execute|perform|run|get|set|create|update|delete)/i,
      ''
    );

    prefixes.forEach((prefix) => {
      const capitalizedBase =
        baseName.charAt(0).toUpperCase() + baseName.slice(1);
      const suggestion = prefix + capitalizedBase;
      if (suggestion !== originalName && suggestion.length > prefix.length) {
        names.push(suggestion);
      }
    });

    // 이벤트 핸들러 패턴
    if (
      originalName.includes('click') ||
      originalName.includes('change') ||
      originalName.includes('submit')
    ) {
      names.push(
        'on' + originalName.charAt(0).toUpperCase() + originalName.slice(1)
      );
      names.push(
        'handle' + originalName.charAt(0).toUpperCase() + originalName.slice(1)
      );
    }
  }

  // Array 타입
  if (type.includes('[]') || type.includes('array')) {
    const itemType = type.replace(/\[\]|array/gi, '').trim();

    if (
      !originalName.endsWith('s') &&
      !originalName.includes('list') &&
      !originalName.includes('array')
    ) {
      names.push(originalName + 's');
      names.push(originalName + 'List');
      names.push(originalName + 'Array');
      names.push(originalName + 'Collection');
    }

    // 타입 기반 이름 제안
    if (itemType && itemType !== 'any') {
      const cleanType = itemType.replace(/[<>]/g, '');
      names.push(cleanType + 's');
      names.push(cleanType + 'List');
      names.push(cleanType + 'Array');
    }
  }

  // String 타입
  if (type.includes('string')) {
    if (originalName.length <= 3) {
      names.push('text', 'textValue', 'stringValue', 'content', 'message');
    }

    // 특정 용도별 제안
    if (originalName.includes('name')) {
      names.push('userName', 'displayName', 'fullName', 'identifier');
    } else if (originalName.includes('id')) {
      names.push('identifier', 'uniqueId', 'recordId');
    }
  }

  // Number 타입
  if (
    type.includes('number') ||
    type === 'int' ||
    type === 'float' ||
    type === 'double'
  ) {
    if (originalName.length <= 3) {
      names.push('value', 'numericValue', 'amount', 'count', 'total');
    }

    // 특정 용도별 제안
    if (originalName.includes('count') || originalName.includes('cnt')) {
      names.push('totalCount', 'itemCount', 'numberOfItems');
    } else if (originalName.includes('size')) {
      names.push('totalSize', 'bufferSize', 'arraySize');
    }
  }

  // Object 타입
  if (type.includes('object') || type.includes('{')) {
    if (originalName === 'obj' || originalName === 'o') {
      names.push('data', 'dataObject', 'entity', 'model', 'instance');
    }

    // 구체적인 타입명이 있는 경우
    const typeMatch = type.match(/^(\w+)(?:<|$)/);
    if (typeMatch && typeMatch[1] !== 'object') {
      const typeName = typeMatch[1];
      names.push(typeName.charAt(0).toLowerCase() + typeName.slice(1));
      names.push(typeName.charAt(0).toLowerCase() + typeName.slice(1) + 'Data');
      names.push(
        typeName.charAt(0).toLowerCase() + typeName.slice(1) + 'Instance'
      );
    }
  }

  return names;
}

// 컨텍스트 기반 이름 생성
function generateContextBasedNames(variable: any): string[] {
  const names: string[] = [];
  const originalName = variable.name;
  const scope = variable.scope.toLowerCase();
  const context = variable.context.toLowerCase();

  // 반복문 내부의 변수
  if (scope.includes('for') || scope.includes('loop')) {
    if (['i', 'j', 'k', 'n'].includes(originalName)) {
      names.push('index', 'currentIndex', 'loopIndex', 'iterator', 'counter');

      // 중첩 루프 감지
      if (originalName === 'j') {
        names.push('innerIndex', 'nestedIndex', 'secondaryIndex');
      } else if (originalName === 'k') {
        names.push('deepIndex', 'tertiaryIndex');
      }
    }

    // for...of 루프
    if (scope.includes('for-of')) {
      names.push('item', 'element', 'current', 'currentItem', 'currentElement');
    }

    // for...in 루프
    if (scope.includes('for-in')) {
      names.push('key', 'propertyName', 'propertyKey', 'attribute');
    }
  }

  // 함수 매개변수
  if (variable.kind === 'parameter') {
    // 콜백 함수
    if (context.includes('callback') || context.includes('handler')) {
      names.push('callback', 'handler', 'listener', 'eventHandler');
    }

    // 이벤트 매개변수
    if (
      context.includes('event') ||
      originalName === 'e' ||
      originalName === 'evt'
    ) {
      names.push('event', 'eventData', 'eventObject', 'eventArgs');
    }

    // 에러 매개변수
    if (
      context.includes('error') ||
      context.includes('catch') ||
      originalName === 'err' ||
      originalName === 'e'
    ) {
      names.push('error', 'exception', 'errorObject', 'caughtError');
    }
  }

  // 클래스 속성
  if (variable.kind === 'property') {
    // private 속성 패턴
    if (originalName.startsWith('_')) {
      const withoutUnderscore = originalName.substring(1);
      names.push(
        'private' +
          withoutUnderscore.charAt(0).toUpperCase() +
          withoutUnderscore.slice(1)
      );
      names.push(withoutUnderscore);
    }
  }

  // try-catch 블록
  if (scope.includes('catch')) {
    if (originalName === 'e' || originalName === 'err') {
      names.push('error', 'exception', 'caughtError', 'thrownError');
    }
  }

  // 임시 변수
  if (originalName.startsWith('temp') || originalName.startsWith('tmp')) {
    const purpose = context.match(/=\s*([a-zA-Z]+)/);
    if (purpose) {
      names.push(
        'temporary' + purpose[1].charAt(0).toUpperCase() + purpose[1].slice(1)
      );
    }
    names.push('temporaryValue', 'intermediateValue', 'bufferValue');
  }

  return names;
}

// 스마트 필터링 및 우선순위 지정
function filterAndPrioritizeSuggestions(
  suggestions: string[],
  variable: any
): string[] {
  const originalName = variable.name;
  const uniqueSuggestions = [...new Set(suggestions)];

  // 필터링: 원본과 같거나 너무 긴 이름 제거
  const filtered = uniqueSuggestions.filter((name) => {
    return (
      name !== originalName &&
      name.length <= 30 &&
      name.length >= 3 &&
      /^[a-zA-Z][a-zA-Z0-9]*$/.test(name)
    ); // 유효한 변수명
  });

  // 우선순위 점수 계산
  const scored = filtered.map((name) => {
    let score = 0;

    // 길이 점수 (8-15자가 이상적)
    if (name.length >= 8 && name.length <= 15) {
      score += 3;
    } else if (name.length >= 5 && name.length <= 20) {
      score += 1;
    }

    // camelCase 점수
    if (/[a-z][A-Z]/.test(name)) {
      score += 2;
    }

    // 의미있는 단어 포함 점수
    const meaningfulWords = [
      'user',
      'data',
      'list',
      'count',
      'index',
      'value',
      'result',
      'response',
      'request',
    ];
    if (meaningfulWords.some((word) => name.toLowerCase().includes(word))) {
      score += 2;
    }

    // 타입과 일치하는 이름
    if (
      variable.type &&
      name
        .toLowerCase()
        .includes(variable.type.toLowerCase().replace(/[<>\[\]]/g, ''))
    ) {
      score += 3;
    }

    // 원본 이름의 일부 포함 (연속성)
    if (
      originalName.length > 2 &&
      name.toLowerCase().includes(originalName.toLowerCase())
    ) {
      score += 1;
    }

    return { name, score };
  });

  // 점수 기준 정렬 후 상위 5개 반환
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.name);
}

/**
 * OpenAI API를 사용하여 변수명 추천을 요청하는 함수
 * @param variable 분석할 변수 정보
 *
 */
async function getAiSuggestions(
  variable: VariableInfo,
  apiKey: string
): Promise<string[]> {
  if (!apiKey) {
    console.error('OpenAI API key was not provided to getAiSuggestions.');
    return [];
  }

  const openai = new OpenAI({ apiKey });

  try {
    console.log('openai 시작중!!');
    const prompt = `
      Analyze the following TypeScript code context and suggest new names for the variable "${variable.name}".
      - Type: "${variable.type}"
      - Scope: "${variable.scope}"
      - Context: \`\`\`typescript\n${variable.context}\n\`\`\`
      Return up to 8 concise and descriptive new variable names in camelCase as a JSON array of strings.
      Example: { "suggestions": ["newUser", "customerProfile", "activeUserList"] }
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 비용 효율적인 최신 모델
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (content) {
      const responseObject = JSON.parse(content);
      const suggestions =
        responseObject.suggestions ||
        responseObject.names ||
        Object.values(responseObject)[0];
      if (Array.isArray(suggestions)) {
        return suggestions;
      }
    }
    return [];
  } catch (error) {
    console.error('Error fetching suggestions from OpenAI API:', error);
    return [];
  }
}

// Main suggestion generation function
export function generateVariableNameSuggestions(variable: any): string[] {
  console.log('추천변수 만들기 동작', variable.name);
  const allSuggestions = [
    ...generateMeaningfulNames(variable),
    ...generateTypeBasedNames(variable),
    ...generateContextBasedNames(variable),
  ];

  return filterAndPrioritizeSuggestions(allSuggestions, variable);
}

/**
 * 메인 추천 생성 함수 (API 키를 인자로 받음)
 */
export async function generateAiSuggestions(
  variable: VariableInfo,
  apiKey: string
): Promise<string[]> {
  // 1. 각 소스로부터 추천 목록을 가져옵니다.
  const aiSuggestions = await getAiSuggestions(variable, apiKey);

  // 2. 스프레드 문법을 사용해 두 배열을 합칩니다.
  //    Set을 이용해 중복을 즉시 제거합니다.
  const allSuggestions = [...new Set([...aiSuggestions])];

  // console.log('규칙 기반 추천:', ruleBasedSuggestions);
  console.log('AI 추천:', aiSuggestions);
  console.log('통합된 추천:', allSuggestions);
  return filterAndPrioritizeSuggestions(allSuggestions, variable);
}
