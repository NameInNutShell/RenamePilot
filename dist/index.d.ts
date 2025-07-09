/**
 * ts-morph를 이용한 AST 초기 설정 클래스
 * 변수 이름 분석 및 개선을 위한 기초 구조
 */
export declare class ASTVariableAnalyzer {
    private project;
    constructor(tsConfigPath?: string);
    /**
     * 소스 파일들을 프로젝트에 추가
     */
    addSourceFiles(pattern: string | string[]): any;
    /**
     * 특정 파일을 프로젝트에 추가
     */
    addSourceFile(filePath: string): any;
    /**
     * 코드 문자열로부터 소스 파일 생성
     */
    createSourceFile(fileName: string, code: string): any;
    /**
     * 프로젝트의 모든 소스 파일 가져오기
     */
    getSourceFiles(): any;
    /**
     * 특정 파일의 AST 구조 출력 (분석 연습용)
     */
    printASTStructure(filePath: string): void;
}
export declare function initializeASTAnalyzer(): Promise<ASTVariableAnalyzer>;
//# sourceMappingURL=index.d.ts.map