import { ASTVariableAnalyzer } from './src/analyzer';

// 이 함수는 'npm run debug' 실행 시 호출됩니다.
async function debugAnalyzer() {
  try {
    console.log('--- 디버그 모드 시작 ---');
    const analyzer = new ASTVariableAnalyzer();

    // 1. samples 폴더의 모든 .ts 파일을 분석 대상으로 추가합니다.
    console.log('샘플 파일 로딩...');
    analyzer.addSourceFiles('samples/**/*.ts');

    // 2. 변수 정보를 수집합니다.
    console.log('변수 정보 수집 중...');
    const variables = analyzer.collectVariableInfo();

    // 3. 수집된 정보를 출력합니다.
    analyzer.printVariableInfo(variables);

    console.log('\n--- 디버그 모드 종료 ---');
  } catch (error) {
    console.error('디버깅 중 오류 발생:', error);
  }
}

debugAnalyzer();
