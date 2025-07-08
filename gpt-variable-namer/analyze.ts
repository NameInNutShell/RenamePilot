import { Project, VariableDeclarationKind } from 'ts-morph';

// 1. 새 ts-morph 프로젝트를 생성합니다.
const project = new Project();

// 2. 분석할 소스 파일을 프로젝트에 추가합니다.
const sourceFile = project.addSourceFileAtPath('sample.ts');

console.log('🔍 분석 시작: sample.ts');
console.log('--------------------------');

// 3. 파일 내에 선언된 모든 변수를 가져옵니다.
//    - getVariableDeclarations()는 let, const, var로 선언된 모든 변수를 찾아줍니다.
const variables = sourceFile.getVariableDeclarations();

// 4. 찾은 변수들의 이름을 하나씩 출력합니다.
variables.forEach((variable) => {
  // getName() 메서드로 변수의 이름을 가져올 수 있습니다.
  const variableName = variable.getName();
  console.log(`✅ 변수 발견: ${variableName}`);
});

console.log('--------------------------');
console.log('✨ 분석 완료!');
