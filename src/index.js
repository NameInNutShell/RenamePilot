"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTVariableAnalyzer = void 0;
exports.initializeASTAnalyzer = initializeASTAnalyzer;
const ts_morph_1 = require("ts-morph");
/**
 * ts-morph를 이용한 AST 초기 설정 클래스
 * 변수 이름 분석 및 개선을 위한 기초 구조
 */
class ASTVariableAnalyzer {
    constructor(tsConfigPath) {
        // ts-morph 프로젝트 초기화
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: tsConfigPath || "./tsconfig.json",
            skipAddingFilesFromTsConfig: false,
            skipFileDependencyResolution: false,
            skipLoadingLibFiles: false,
        });
    }
    /**
     * 소스 파일들을 프로젝트에 추가
     */
    addSourceFiles(pattern) {
        return this.project.addSourceFilesAtPaths(pattern);
    }
    /**
     * 특정 파일을 프로젝트에 추가
     */
    addSourceFile(filePath) {
        return this.project.addSourceFileAtPath(filePath);
    }
    /**
     * 코드 문자열로부터 소스 파일 생성
     */
    createSourceFile(fileName, code) {
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
    printASTStructure(filePath) {
        const sourceFile = this.project.getSourceFile(filePath);
        if (!sourceFile) {
            console.error(`파일을 찾을 수 없습니다: ${filePath}`);
            return;
        }
        console.log(`\n=== AST 구조 분석: ${filePath} ===`);
        // 재귀적으로 AST 노드 출력
        const printNode = (node, depth = 0) => {
            const indent = "  ".repeat(depth);
            const kindName = ts_morph_1.SyntaxKind[node.getKind()];
            const text = node.getText().slice(0, 50).replace(/\n/g, "\\n");
            console.log(`${indent}${kindName}: "${text}"`);
            node.forEachChild(child => {
                printNode(child, depth + 1);
            });
        };
        printNode(sourceFile);
    }
}
exports.ASTVariableAnalyzer = ASTVariableAnalyzer;
/**
 * 프로젝트에서 모든 변수 정보 수집
 */
collectVariableInfo();
VariableInfo[];
{
    const variables = [];
    this.project.getSourceFiles().forEach(sourceFile => {
        const filePath = sourceFile.getFilePath();
        // 변수 선언 수집
        sourceFile.getVariableDeclarations().forEach(varDecl => {
            variables.push(this.extractVariableInfo(varDecl, 'variable', filePath));
        });
        // 함수 매개변수 수집
        sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Parameter).forEach(param => {
            variables.push(this.extractParameterInfo(param, filePath));
        });
        // 클래스 프로퍼티 수집
        sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.PropertyDeclaration).forEach(prop => {
            variables.push(this.extractPropertyInfo(prop, filePath));
        });
    });
    return variables;
}
extractVariableInfo(varDecl, ts_morph_1.VariableDeclaration, kind, 'variable', filePath, string);
VariableInfo;
{
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
            column: varDecl.getStartLinePos()
        },
        context
    };
}
extractParameterInfo(param, ts_morph_1.ParameterDeclaration, filePath, string);
VariableInfo;
{
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
            column: param.getStartLinePos()
        },
        context
    };
}
extractPropertyInfo(prop, ts_morph_1.PropertyDeclaration, filePath, string);
VariableInfo;
{
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
            column: prop.getStartLinePos()
        },
        context
    };
}
getScopeInfo(node, ts_morph_1.Node);
string;
{
    const ancestors = node.getAncestors();
    const scopes = [];
    for (const ancestor of ancestors) {
        if (ancestor.getKind() === ts_morph_1.SyntaxKind.FunctionDeclaration) {
            const funcDecl = ancestor.asKindOrThrow(ts_morph_1.SyntaxKind.FunctionDeclaration);
            scopes.push(`function:${funcDecl.getName() || 'anonymous'}`);
        }
        else if (ancestor.getKind() === ts_morph_1.SyntaxKind.ClassDeclaration) {
            const classDecl = ancestor.asKindOrThrow(ts_morph_1.SyntaxKind.ClassDeclaration);
            scopes.push(`class:${classDecl.getName() || 'anonymous'}`);
        }
        else if (ancestor.getKind() === ts_morph_1.SyntaxKind.MethodDeclaration) {
            const methodDecl = ancestor.asKindOrThrow(ts_morph_1.SyntaxKind.MethodDeclaration);
            scopes.push(`method:${methodDecl.getName()}`);
        }
    }
    return scopes.reverse().join(' -> ') || 'global';
}
getContextInfo(node, ts_morph_1.Node);
string;
{
    const parent = node.getParent();
    if (!parent)
        return '';
    // 부모 노드의 텍스트를 가져와서 컨텍스트로 사용
    const parentText = parent.getText();
    return parentText.length > 200 ? parentText.slice(0, 200) + '...' : parentText;
}
/**
 * 변수 정보를 JSON 형태로 출력
 */
printVariableInfo(variables, VariableInfo[]);
{
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
/**
 * 변수 이름 품질 분석을 위한 기초 메서드
 */
analyzeVariableNameQuality(variables, VariableInfo[]);
{
    console.log('\n=== 변수 이름 품질 기초 분석 ===');
    const analysis = {
        shortNames: variables.filter(v => v.name.length <= 2),
        genericNames: variables.filter(v => ['data', 'item', 'temp', 'tmp', 'obj', 'result'].includes(v.name.toLowerCase())),
        abbreviations: variables.filter(v => /^[a-z]+[A-Z]/.test(v.name) && v.name.length <= 5),
        totalVariables: variables.length
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
async;
save();
{
    await this.project.save();
}
/**
 * 리소스 정리
 */
dispose();
{
    // 필요한 경우 리소스 정리 로직 추가
}
// 사용 예시
function initializeASTAnalyzer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // AST 분석기 초기화
            const analyzer = new ASTVariableAnalyzer();
            // 예시: TypeScript 파일들을 프로젝트에 추가
            analyzer.addSourceFiles("src/**/*.ts");
            // 또는 특정 파일 추가
            // analyzer.addSourceFile("./example.ts");
            // 또는 코드 문자열로 테스트 파일 생성
            const testCode = `
      class UserService {
        private db: Database;
        
        constructor(database: Database) {
          this.db = database;
        }
        
        async getUserById(id: number): Promise<User> {
          const result = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
          const userData = result[0];
          return new User(userData);
        }
        
        processUserData(data: any) {
          const temp = data.map(item => item.name);
          return temp;
        }
      }
    `;
            const testFile = analyzer.createSourceFile("test.ts", testCode);
            // AST 구조 출력 (학습 목적)
            analyzer.printASTStructure("test.ts");
            // 변수 정보 수집
            const variables = analyzer.collectVariableInfo();
            // 변수 정보 출력
            analyzer.printVariableInfo(variables);
            // 변수 이름 품질 분석
            analyzer.analyzeVariableNameQuality(variables);
            return analyzer;
        }
        catch (error) {
            console.error('AST 분석기 초기화 실패:', error);
            throw error;
        }
    });
}
// 메인 실행 함수
if (require.main === module) {
    initializeASTAnalyzer()
        .then(analyzer => {
        console.log('AST 분석기 초기화 완료');
        // 추가 작업 수행 가능
    })
        .catch(error => {
        console.error('실행 실패:', error);
    });
}
