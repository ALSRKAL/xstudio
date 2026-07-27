export const useLanguageDetection = () => {
  const detectLanguage = (code) => {
    const languagePatterns = {
      javascript: /\b(const|let|var|function|=>|console\.log|import|export)\b/,
      python: /\b(def|import|from|print|class|if __name__|self)\b/,
      java: /\b(public|private|class|void|static|System\.out)\b/,
      cpp: /\b(#include|iostream|std::|cout|cin|namespace)\b/,
      csharp: /\b(using|namespace|public|private|class|void|Console\.WriteLine)\b/,
      html: /<\/?[a-z][\s\S]*>/i,
      css: /\{[\s\S]*:[^:]+;[\s\S]*\}/,
      sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE)\b/i,
      json: /^\s*[{[]/,
      bash: /\b(echo|cd|ls|mkdir|rm|chmod|sudo|apt|npm|yarn)\b/,
      ruby: /\b(def|end|puts|require|class|module)\b/,
      php: /<\?php|\$[a-zA-Z_]/,
      go: /\b(package|func|import|fmt\.Println|var|type)\b/,
      rust: /\b(fn|let|mut|impl|struct|use|println!)\b/,
      swift: /\b(func|var|let|import|class|struct|print)\b/,
      kotlin: /\b(fun|val|var|class|object|println)\b/,
    };

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }
    return 'text';
  };

  return { detectLanguage };
};
