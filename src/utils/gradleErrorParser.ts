export interface ParsedGradleError {
  file: string;
  line: number;
  column: number;
  message: string;
  errorType: string;
  rawLine: string;
  stackTrace?: string;
}

export function parseGradleOutput(output: string): {
  hasErrors: boolean;
  errors: ParsedGradleError[];
  primaryError?: ParsedGradleError;
  failureReason?: string;
} {
  if (!output) {
    return { hasErrors: false, errors: [] };
  }

  const lines = output.split('\n');
  const errors: ParsedGradleError[] = [];
  let failureReason: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Kotlin compiler pattern:
    // e: /path/to/File.kt:15:23 Unresolved reference: abc
    // e: /path/to/File.kt: (15, 23): Unresolved reference: abc
    const ktMatch = line.match(/^e:\s+(.+?\.kt):\s*(?:\(?(\d+),\s*(\d+)\)?|(\d+):(\d+)):\s*(.+)$/i);
    if (ktMatch) {
      const filePath = ktMatch[1];
      const lineNum = parseInt(ktMatch[2] || ktMatch[4] || '1', 10);
      const colNum = parseInt(ktMatch[3] || ktMatch[5] || '1', 10);
      const msg = ktMatch[6];
      let errType = 'CompilationError';
      if (msg.includes('Unresolved reference')) errType = 'UnresolvedReference';
      else if (msg.includes('Type mismatch')) errType = 'TypeMismatch';
      else if (msg.includes('Expecting')) errType = 'SyntaxError';

      errors.push({
        file: filePath.split('/app/').pop() || filePath,
        line: lineNum,
        column: colNum,
        message: msg,
        errorType: errType,
        rawLine: line,
      });
      continue;
    }

    // 2. Java compiler pattern:
    // /path/to/File.java:15: error: cannot find symbol
    const javaMatch = line.match(/^(.+?\.java):(\d+):\s*error:\s*(.+)$/i);
    if (javaMatch) {
      const filePath = javaMatch[1];
      const lineNum = parseInt(javaMatch[2] || '1', 10);
      const msg = javaMatch[3];
      errors.push({
        file: filePath.split('/app/').pop() || filePath,
        line: lineNum,
        column: 1,
        message: msg,
        errorType: 'JavaCompilationError',
        rawLine: line,
      });
      continue;
    }

    // 3. XML / AAPT pattern:
    // /path/to/res/layout/activity_main.xml:12: AAPT: error: resource not found
    const xmlMatch = line.match(/^(.+?\.xml):(\d+):\s*(?:AAPT:\s*)?error:\s*(.+)$/i);
    if (xmlMatch) {
      errors.push({
        file: xmlMatch[1].split('/app/').pop() || xmlMatch[1],
        line: parseInt(xmlMatch[2] || '1', 10),
        column: 1,
        message: xmlMatch[3],
        errorType: 'AaptResourceError',
        rawLine: line,
      });
      continue;
    }

    // 4. Gradle * Where: & * What went wrong:
    if (line.startsWith('* What went wrong:')) {
      const nextLine = lines[i + 1]?.trim() || '';
      failureReason = nextLine;
      if (!errors.some(e => e.message === nextLine)) {
        errors.push({
          file: 'build.gradle.kts',
          line: 1,
          column: 1,
          message: nextLine || 'Gradle task execution failed',
          errorType: 'GradleTaskExecutionError',
          rawLine: line,
        });
      }
    }
  }

  return {
    hasErrors: errors.length > 0 || Boolean(failureReason),
    errors,
    primaryError: errors[0],
    failureReason,
  };
}
