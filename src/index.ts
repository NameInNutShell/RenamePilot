import * as path from 'path';
import {
  Project,
  SyntaxKind,
  Node,
  VariableDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
} from 'ts-morph';
const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

interface VariableInfo {
  name: string;
  type: string;
  kind: 'variable' | 'parameter' | 'property';
  scope: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  context: string; // 변수 주변 코드 컨텍스트
}

/**
 * ts-morph를 이용한 AST 초기 설정 클래스
 * 변수 이름 분석 및 개선을 위한 기초 구조
 */
export class ASTVariableAnalyzer {
  private project: Project;

  constructor(tsConfigPath?: string) {
    // ts-morph 프로젝트 초기화
    this.project = new Project({
      tsConfigFilePath: tsConfigPath || './tsconfig.json',
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: false,
      skipLoadingLibFiles: false,
    });
  }

  /**
   * 소스 파일들을 프로젝트에 추가
   */
  addSourceFiles(pattern: string | string[]) {
    return this.project.addSourceFilesAtPaths(pattern);
  }

  /**
   * 특정 파일을 프로젝트에 추가
   */
  addSourceFile(filePath: string) {
    return this.project.addSourceFileAtPath(filePath);
  }

  /**
   * 코드 문자열로부터 소스 파일 생성
   */
  createSourceFile(fileName: string, code: string) {
    return this.project.createSourceFile(fileName, code);
  }

  /**
   * 프로젝트의 모든 소스 파일 가져오기
   */
  getSourceFiles() {
    return this.project.getSourceFiles();
  }

  /**
   * 특정 파일의 AST 구조 출력 (분석 연습용)
   */
  printASTStructure(filePath: string) {
    const sourceFile = this.project.getSourceFile(filePath);
    if (!sourceFile) {
      console.error(`파일을 찾을 수 없습니다: ${filePath}`);
      return;
    }

    console.log(`\n=== AST 구조 분석: ${filePath} ===`);

    // 재귀적으로 AST 노드 출력
    const printNode = (node: Node, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      const kindName = SyntaxKind[node.getKind()];
      const text = node.getText().slice(0, 50).replace(/\n/g, '\\n');

      console.log(`${indent}${kindName}: "${text}"`);

      node.forEachChild((child) => {
        printNode(child, depth + 1);
      });
    };

    printNode(sourceFile);
  }

  /**
   * 변수 정보를 담는 인터페이스
   */

  /**
   * 프로젝트에서 모든 변수 정보 수집
   */
  collectVariableInfo(): VariableInfo[] {
    const variables: VariableInfo[] = [];

    this.project.getSourceFiles().forEach((sourceFile) => {
      const filePath = sourceFile.getFilePath();

      // 변수 선언 수집
      sourceFile.getVariableDeclarations().forEach((varDecl) => {
        variables.push(this.extractVariableInfo(varDecl, 'variable', filePath));
      });

      // 함수 매개변수 수집
      sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach((param) => {
        variables.push(this.extractParameterInfo(param, filePath));
      });

      // 클래스 프로퍼티 수집
      sourceFile
        .getDescendantsOfKind(SyntaxKind.PropertyDeclaration)
        .forEach((prop) => {
          variables.push(this.extractPropertyInfo(prop, filePath));
        });
    });

    return variables;
  }

  /**
   * 변수 선언에서 정보 추출
   */
  private extractVariableInfo(
    varDecl: VariableDeclaration,
    kind: 'variable',
    filePath: string
  ): VariableInfo {
    const name = varDecl.getName();
    const type = varDecl.getType().getText();
    const pos = varDecl.getStartLineNumber();
    const scope = this.getScopeInfo(varDecl);
    const context = this.getContextInfo(varDecl);

    return {
      name,
      type,
      kind,
      scope,
      location: {
        file: filePath,
        line: pos,
        column: varDecl.getStartLinePos(),
      },
      context,
    };
  }

  /**
   * 매개변수에서 정보 추출
   */
  private extractParameterInfo(
    param: ParameterDeclaration,
    filePath: string
  ): VariableInfo {
    const name = param.getName();
    const type = param.getType().getText();
    const pos = param.getStartLineNumber();
    const scope = this.getScopeInfo(param);
    const context = this.getContextInfo(param);

    return {
      name,
      type,
      kind: 'parameter',
      scope,
      location: {
        file: filePath,
        line: pos,
        column: param.getStartLinePos(),
      },
      context,
    };
  }

  /**
   * 프로퍼티에서 정보 추출
   */
  private extractPropertyInfo(
    prop: PropertyDeclaration,
    filePath: string
  ): VariableInfo {
    const name = prop.getName();
    const type = prop.getType().getText();
    const pos = prop.getStartLineNumber();
    const scope = this.getScopeInfo(prop);
    const context = this.getContextInfo(prop);

    return {
      name,
      type,
      kind: 'property',
      scope,
      location: {
        file: filePath,
        line: pos,
        column: prop.getStartLinePos(),
      },
      context,
    };
  }

  /**
   * 노드의 스코프 정보 가져오기
   */
  private getScopeInfo(node: Node): string {
    const ancestors = node.getAncestors();
    const scopes: string[] = [];

    for (const ancestor of ancestors) {
      if (ancestor.getKind() === SyntaxKind.FunctionDeclaration) {
        const funcDecl = ancestor.asKindOrThrow(SyntaxKind.FunctionDeclaration);
        scopes.push(`function:${funcDecl.getName() || 'anonymous'}`);
      } else if (ancestor.getKind() === SyntaxKind.ClassDeclaration) {
        const classDecl = ancestor.asKindOrThrow(SyntaxKind.ClassDeclaration);
        scopes.push(`class:${classDecl.getName() || 'anonymous'}`);
      } else if (ancestor.getKind() === SyntaxKind.MethodDeclaration) {
        const methodDecl = ancestor.asKindOrThrow(SyntaxKind.MethodDeclaration);
        scopes.push(`method:${methodDecl.getName()}`);
      }
    }

    return scopes.reverse().join(' -> ') || 'global';
  }

  /**
   * 변수 주변 컨텍스트 정보 가져오기
   */
  private getContextInfo(node: Node): string {
    const parent = node.getParent();
    if (!parent) return '';

    // 부모 노드의 텍스트를 가져와서 컨텍스트로 사용
    const parentText = parent.getText();
    return parentText.length > 200
      ? parentText.slice(0, 200) + '...'
      : parentText;
  }

  /**
   * 변수 정보를 JSON 형태로 출력
   */
  printVariableInfo(variables: VariableInfo[]) {
    console.log('\n=== 수집된 변수 정보 ===');
    variables.forEach((variable, index) => {
      console.log(`\n${index + 1}. ${variable.name}`);
      console.log(`   타입: ${variable.type}`);
      console.log(`   종류: ${variable.kind}`);
      console.log(`   스코프: ${variable.scope}`);
      console.log(
        `   위치: ${variable.location.file}:${variable.location.line}`
      );
      console.log(`   컨텍스트: ${variable.context.slice(0, 100)}...`);
    });
  }

  /**
   * 변수 이름 품질 분석을 위한 기초 메서드
   */
  analyzeVariableNameQuality(variables: VariableInfo[]) {
    console.log('\n=== 변수 이름 품질 기초 분석 ===');

    const analysis = {
      shortNames: variables.filter((v) => v.name.length <= 2),
      genericNames: variables.filter((v) =>
        ['data', 'item', 'temp', 'tmp', 'obj', 'result'].includes(
          v.name.toLowerCase()
        )
      ),
      abbreviations: variables.filter(
        (v) => /^[a-z]+[A-Z]/.test(v.name) && v.name.length <= 5
      ),
      totalVariables: variables.length,
    };

    console.log(`전체 변수 수: ${analysis.totalVariables}`);
    console.log(`짧은 이름 (2자 이하): ${analysis.shortNames.length}개`);
    console.log(`일반적인 이름: ${analysis.genericNames.length}개`);
    console.log(`축약 형태: ${analysis.abbreviations.length}개`);

    return analysis;
  }

  /**
   * 프로젝트 저장
   */
  async save() {
    await this.project.save();
  }

  /**
   * 리소스 정리
   */
  dispose() {
    // 필요한 경우 리소스 정리 로직 추가
  }
}

// 사용 예시
export async function initializeASTAnalyzer() {
  try {
    // AST 분석기 초기화
    const analyzer = new ASTVariableAnalyzer();

    // 예시: TypeScript 파일들을 프로젝트에 추가
    analyzer.addSourceFiles('src/examplefiles/**/*.ts');

    // 또는 특정 파일 추가
    // analyzer.addSourceFile("./example.ts");

    /*
    // 또는 코드 문자열로 테스트 파일 생성
    const testCode = `
      
    `;

    //const testFile = analyzer.createSourceFile('test.ts', testCode);
    */
    // AST 구조 출력 (학습 목적)
    analyzer.printASTStructure('test.ts');

    // 변수 정보 수집
    const variables = analyzer.collectVariableInfo();

    // 변수 정보 출력
    analyzer.printVariableInfo(variables);

    // 변수 이름 품질 분석
    analyzer.analyzeVariableNameQuality(variables);

    return analyzer;
  } catch (error) {
    console.error('AST 분석기 초기화 실패:', error);
    throw error;
  }
}

// 메인 실행 함수
if (require.main === module) {
  initializeASTAnalyzer()
    .then((analyzer) => {
      console.log('AST 분석기 초기화 완료');
      // 추가 작업 수행 가능
    })
    .catch((error) => {
      console.error('실행 실패:', error);
    });
}
