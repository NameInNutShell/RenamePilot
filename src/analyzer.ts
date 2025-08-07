// analyzer.ts - 간소화된 통합 버전
import * as path from 'path';
import {
  Project,
  SyntaxKind,
  Node,
  VariableDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
} from 'ts-morph';

export interface VariableInfo {
  name: string;
  type: string;
  kind: 'variable' | 'parameter' | 'property';
  scope: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  context: string;
}

/**
 * TSMorph를 활용한 TypeScript 변수 분석기
 * VSCode 확장과 독립 실행 모두 지원
 */
export class ASTVariableAnalyzer {
  private project: Project;

  constructor(isVSCodeExtension: boolean = true) {
    try {
      if (isVSCodeExtension) {
        // VSCode 확장 환경용 설정
        this.project = new Project({
          useInMemoryFileSystem: true,
          skipAddingFilesFromTsConfig: true,
          skipFileDependencyResolution: true,
          skipLoadingLibFiles: true,
        });
      } else {
        // 독립 실행 환경용 설정
        this.project = new Project({
          tsConfigFilePath: './tsconfig.json',
          skipAddingFilesFromTsConfig: true,
          skipFileDependencyResolution: false,
          skipLoadingLibFiles: false,
        });
      }
    } catch (error) {
      console.error('Project 초기화 실패, 기본 설정으로 재시도:', error);
      this.project = new Project();
    }
  }

  // 공통 메서드들
  addSourceFiles(pattern: string | string[]) {
    return this.project.addSourceFilesAtPaths(pattern);
  }

  addSourceFile(filePath: string) {
    return this.project.addSourceFileAtPath(filePath);
  }

  createSourceFile(fileName: string, code: string) {
    return this.project.createSourceFile(fileName, code);
  }

  getSourceFiles() {
    return this.project.getSourceFiles();
  }

  /**
   * 모든 변수 정보 수집
   */
  collectVariableInfo(): VariableInfo[] {
    const variables: VariableInfo[] = [];

    this.project.getSourceFiles().forEach((sourceFile) => {
      const filePath = sourceFile.getFilePath();

      // 변수 선언
      sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((varDecl) => {
        variables.push(this.extractVariableInfo(varDecl, 'variable', filePath));
      });

      // 함수 매개변수
      sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach((param) => {
        variables.push(this.extractParameterInfo(param, filePath));
      });

      // 클래스 속성
      sourceFile.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach((prop) => {
        variables.push(this.extractPropertyInfo(prop, filePath));
      });

      // for 루프 변수들
      this.collectLoopVariables(sourceFile, variables, filePath);

      // catch 블록 변수
      sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause).forEach((catchClause) => {
        const varDecl = catchClause.getVariableDeclaration();
        if (varDecl) {
          variables.push(this.extractVariableInfo(varDecl, 'variable', filePath));
        }
      });
    });

    return variables;
  }

  private collectLoopVariables(sourceFile: any, variables: VariableInfo[], filePath: string) {
    // for...of 루프
    sourceFile.getDescendantsOfKind(SyntaxKind.ForOfStatement).forEach((forOf: any) => {
      const varDecl = forOf.getInitializer();
      if (varDecl && varDecl.getKind() === SyntaxKind.VariableDeclarationList) {
        const varDeclList = varDecl.asKindOrThrow(SyntaxKind.VariableDeclarationList);
        varDeclList.getDeclarations().forEach((decl: any) => {
          variables.push(this.extractVariableInfo(decl, 'variable', filePath));
        });
      }
    });

    // for...in 루프
    sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement).forEach((forIn: any) => {
      const varDecl = forIn.getInitializer();
      if (varDecl && varDecl.getKind() === SyntaxKind.VariableDeclarationList) {
        const varDeclList = varDecl.asKindOrThrow(SyntaxKind.VariableDeclarationList);
        varDeclList.getDeclarations().forEach((decl: any) => {
          variables.push(this.extractVariableInfo(decl, 'variable', filePath));
        });
      }
    });
  }

  private extractVariableInfo(varDecl: VariableDeclaration, kind: 'variable', filePath: string): VariableInfo {
    return {
      name: varDecl.getName(),
      type: varDecl.getType().getText(),
      kind,
      scope: this.getScopeInfo(varDecl),
      location: {
        file: filePath,
        line: varDecl.getStartLineNumber(),
        column: varDecl.getStartLinePos(),
      },
      context: this.getContextInfo(varDecl),
    };
  }

  private extractParameterInfo(param: ParameterDeclaration, filePath: string): VariableInfo {
    return {
      name: param.getName(),
      type: param.getType().getText(),
      kind: 'parameter',
      scope: this.getScopeInfo(param),
      location: {
        file: filePath,
        line: param.getStartLineNumber(),
        column: param.getStartLinePos(),
      },
      context: this.getContextInfo(param),
    };
  }

  private extractPropertyInfo(prop: PropertyDeclaration, filePath: string): VariableInfo {
    return {
      name: prop.getName(),
      type: prop.getType().getText(),
      kind: 'property',
      scope: this.getScopeInfo(prop),
      location: {
        file: filePath,
        line: prop.getStartLineNumber(),
        column: prop.getStartLinePos(),
      },
      context: this.getContextInfo(prop),
    };
  }

  private getScopeInfo(node: Node): string {
    const ancestors = node.getAncestors();
    const scopes: string[] = [];

    for (const ancestor of ancestors) {
      switch (ancestor.getKind()) {
        case SyntaxKind.FunctionDeclaration:
          const funcDecl = ancestor.asKindOrThrow(SyntaxKind.FunctionDeclaration);
          scopes.push(`function:${funcDecl.getName() || 'anonymous'}`);
          break;
        case SyntaxKind.ArrowFunction:
          scopes.push('arrow-function');
          break;
        case SyntaxKind.FunctionExpression:
          const funcExpr = ancestor.asKindOrThrow(SyntaxKind.FunctionExpression);
          scopes.push(`function-expr:${funcExpr.getName() || 'anonymous'}`);
          break;
        case SyntaxKind.ClassDeclaration:
          const classDecl = ancestor.asKindOrThrow(SyntaxKind.ClassDeclaration);
          scopes.push(`class:${classDecl.getName() || 'anonymous'}`);
          break;
        case SyntaxKind.MethodDeclaration:
          const methodDecl = ancestor.asKindOrThrow(SyntaxKind.MethodDeclaration);
          scopes.push(`method:${methodDecl.getName()}`);
          break;
        case SyntaxKind.ForStatement:
          scopes.push('for-loop');
          break;
        case SyntaxKind.ForOfStatement:
          scopes.push('for-of-loop');
          break;
        case SyntaxKind.ForInStatement:
          scopes.push('for-in-loop');
          break;
        case SyntaxKind.Block:
          const blockParent = ancestor.getParent();
          if (blockParent) {
            const parentKind = blockParent.getKind();
            if (parentKind === SyntaxKind.IfStatement) {
              scopes.push('if-block');
            } else if (parentKind === SyntaxKind.WhileStatement) {
              scopes.push('while-block');
            } else if (parentKind === SyntaxKind.TryStatement) {
              scopes.push('try-block');
            }
          }
          break;
        case SyntaxKind.CatchClause:
          scopes.push('catch-block');
          break;
      }
    }

    return scopes.reverse().join(' -> ') || 'global';
  }

  private getContextInfo(node: Node): string {
    const parent = node.getParent();
    if (!parent) return '';

    const parentText = parent.getText();
    return parentText.length > 200 ? parentText.slice(0, 200) + '...' : parentText;
  }

  // 유틸리티 메서드들
  printVariableInfo(variables: VariableInfo[]) {
    console.log('\n=== 수집된 변수 정보 ===');
    variables.forEach((variable, index) => {
      console.log(`\n${index + 1}. ${variable.name}`);
      console.log(`   타입: ${variable.type}`);
      console.log(`   종류: ${variable.kind}`);
      console.log(`   스코프: ${variable.scope}`);
      console.log(`   위치: ${variable.location.file}:${variable.location.line}`);
      console.log(`   컨텍스트: ${variable.context.slice(0, 100)}...`);
    });
  }

  analyzeVariableNameQuality(variables: VariableInfo[]) {
    console.log('\n=== 변수 이름 품질 기초 분석 ===');

    const analysis = {
      shortNames: variables.filter((v) => v.name.length <= 2),
      genericNames: variables.filter((v) =>
        ['data', 'item', 'temp', 'tmp', 'obj', 'result'].includes(v.name.toLowerCase())
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

  async save() {
    await this.project.save();
  }

  dispose() {
    // 필요한 경우 리소스 정리
  }
}

// 독립 실행용 함수 (기존 호환성 유지)
export async function initializeASTAnalyzer() {
  try {
    const analyzer = new ASTVariableAnalyzer(false); // 독립 실행 모드

    // 예시 파일 추가
    analyzer.addSourceFiles('src/examplefiles/**/*.ts');

    // 변수 정보 수집 및 분석
    const variables = analyzer.collectVariableInfo();
    analyzer.printVariableInfo(variables);
    analyzer.analyzeVariableNameQuality(variables);

    return analyzer;
  } catch (error) {
    console.error('AST 분석기 초기화 실패:', error);
    throw error;
  }
}

// 메인 실행 (독립 실행 시)
if (require.main === module) {
  initializeASTAnalyzer()
    .then((analyzer) => {
      console.log('AST 분석기 초기화 완료');
    })
    .catch((error) => {
      console.error('실행 실패:', error);
    });
}