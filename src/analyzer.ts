import * as path from 'path';
import {
  Project,
  SyntaxKind,
  Node,
  VariableDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
} from 'ts-morph';

import { VariableInfo } from './types';

/**
 * ts-morph를 이용한 AST 초기 설정 클래스
 * 변수 이름 분석 및 개선을 위한 기초 구조
 */
export class ASTVariableAnalyzer {
  private project: Project;

  constructor() {
    try {
      // VS Code 확장 프로그램 환경에서는 최소한의 설정으로 Project 생성
      this.project = new Project({
        useInMemoryFileSystem: true, // 메모리 파일 시스템 사용
        // 디버그모드 : false, 익스텐션 실행시 : true
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
        skipLoadingLibFiles: true,
      });
    } catch (error) {
      console.error('Project 초기화 실패, 기본 설정으로 재시도:', error);
      // 최소한의 설정으로 재시도
      this.project = new Project();
    }
  }

  // // 디버깅용
  // public static forDebug(tsConfigPath: string): ASTVariableAnalyzer {
  //   const analyzer = new ASTVariableAnalyzer();
  //   analyzer.project = new Project({
  //     tsConfigFilePath: tsConfigPath,
  //   });
  //   return analyzer;
  // }

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

      // 방법 1: 모든 VariableDeclaration 노드를 재귀적으로 찾기
      sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .forEach((varDecl) => {
          variables.push(
            this.extractVariableInfo(varDecl, 'variable', filePath)
          );
        });

      // 방법 2: 함수 매개변수 수집 (기존과 동일)
      sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach((param) => {
        variables.push(this.extractParameterInfo(param, filePath));
      });

      // 방법 3: 클래스 프로퍼티 수집 (기존과 동일)
      sourceFile
        .getDescendantsOfKind(SyntaxKind.PropertyDeclaration)
        .forEach((prop) => {
          variables.push(this.extractPropertyInfo(prop, filePath));
        });

      // 방법 4: for...of, for...in 루프의 변수들도 수집
      sourceFile
        .getDescendantsOfKind(SyntaxKind.ForOfStatement)
        .forEach((forOf) => {
          const varDecl = forOf.getInitializer();
          if (
            varDecl &&
            varDecl.getKind() === SyntaxKind.VariableDeclarationList
          ) {
            const varDeclList = varDecl.asKindOrThrow(
              SyntaxKind.VariableDeclarationList
            );
            varDeclList.getDeclarations().forEach((decl) => {
              variables.push(
                this.extractVariableInfo(decl, 'variable', filePath)
              );
            });
          }
        });

      sourceFile
        .getDescendantsOfKind(SyntaxKind.ForInStatement)
        .forEach((forIn) => {
          const varDecl = forIn.getInitializer();
          if (
            varDecl &&
            varDecl.getKind() === SyntaxKind.VariableDeclarationList
          ) {
            const varDeclList = varDecl.asKindOrThrow(
              SyntaxKind.VariableDeclarationList
            );
            varDeclList.getDeclarations().forEach((decl) => {
              variables.push(
                this.extractVariableInfo(decl, 'variable', filePath)
              );
            });
          }
        });

      // 방법 5: catch 블록의 변수도 수집
      sourceFile
        .getDescendantsOfKind(SyntaxKind.CatchClause)
        .forEach((catchClause) => {
          const varDecl = catchClause.getVariableDeclaration();
          if (varDecl) {
            variables.push(
              this.extractVariableInfo(varDecl, 'variable', filePath)
            );
          }
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
      switch (ancestor.getKind()) {
        case SyntaxKind.FunctionDeclaration:
          const funcDecl = ancestor.asKindOrThrow(
            SyntaxKind.FunctionDeclaration
          );
          scopes.push(`function:${funcDecl.getName() || 'anonymous'}`);
          break;

        case SyntaxKind.ArrowFunction:
          scopes.push('arrow-function');
          break;

        case SyntaxKind.FunctionExpression:
          const funcExpr = ancestor.asKindOrThrow(
            SyntaxKind.FunctionExpression
          );
          scopes.push(`function-expr:${funcExpr.getName() || 'anonymous'}`);
          break;

        case SyntaxKind.ClassDeclaration:
          const classDecl = ancestor.asKindOrThrow(SyntaxKind.ClassDeclaration);
          scopes.push(`class:${classDecl.getName() || 'anonymous'}`);
          break;

        case SyntaxKind.MethodDeclaration:
          const methodDecl = ancestor.asKindOrThrow(
            SyntaxKind.MethodDeclaration
          );
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
          // 블록 스코프도 표시 (if, while 등)
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
