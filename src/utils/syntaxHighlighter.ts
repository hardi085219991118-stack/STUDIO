// Syntax Highlighter for Darcula Theme without external runtime dependencies
// Supports Kotlin, Java, XML, Gradle KTS/Groovy, JSON, Markdown, JS/TS

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function highlightCode(code: string, language: string): string {
  if (!code) return '';

  const lang = language.toLowerCase();

  // XML / HTML
  if (lang === 'xml' || lang === 'html') {
    return code
      .split('\n')
      .map(line => {
        let escaped = escapeHtml(line);
        // Comments
        escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#808080;font-style:italic;">$1</span>');
        // XML tags
        escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9_\-\.]+)/g, '$1<span style="color:#e8bf6a;font-weight:bold;">$2</span>');
        // XML attributes (e.g. android:id)
        escaped = escaped.replace(/([a-zA-Z0-9_\-:]+)=/g, '<span style="color:#9876aa;">$1</span>=');
        // Attribute values in quotes
        escaped = escaped.replace(/(=&quot;)(.*?)(&quot;)/g, '$1<span style="color:#6a8759;">$2</span>$3');
        escaped = escaped.replace(/(&quot;)(.*?)(&quot;)/g, '<span style="color:#6a8759;">&quot;$2&quot;</span>');
        return escaped;
      })
      .join('\n');
  }

  // JSON
  if (lang === 'json') {
    return code
      .split('\n')
      .map(line => {
        let escaped = escapeHtml(line);
        // Keys: "key":
        escaped = escaped.replace(/(&quot;.*?&quot;)(\s*:)/g, '<span style="color:#9876aa;font-weight:bold;">$1</span>$2');
        // Values strings
        escaped = escaped.replace(/:\s*(&quot;.*?&quot;)/g, ': <span style="color:#6a8759;">$1</span>');
        // Numbers & booleans
        escaped = escaped.replace(/\b(true|false|null)\b/g, '<span style="color:#cc7832;font-weight:bold;">$1</span>');
        escaped = escaped.replace(/\b(\d+)\b/g, '<span style="color:#6897bb;">$1</span>');
        return escaped;
      })
      .join('\n');
  }

  // Kotlin, Java, Gradle, Groovy, JS, TS
  const kotlinKeywords = [
    'package', 'import', 'class', 'interface', 'object', 'fun', 'val', 'var',
    'override', 'public', 'private', 'protected', 'internal', 'abstract', 'final',
    'open', 'companion', 'data', 'sealed', 'enum', 'return', 'if', 'else', 'when',
    'for', 'while', 'do', 'try', 'catch', 'finally', 'throw', 'this', 'super', 'is',
    'as', 'in', 'null', 'true', 'false', 'plugins', 'android', 'dependencies',
    'implementation', 'defaultConfig', 'buildTypes', 'release', 'debug', 'compileSdk',
    'minSdk', 'targetSdk', 'versionCode', 'versionName', 'namespace', 'applicationId',
    'void', 'extends', 'implements', 'new', 'static', 'const', 'let', 'function'
  ];

  const keywordRegex = new RegExp(`\\b(${kotlinKeywords.join('|')})\\b`, 'g');

  return code
    .split('\n')
    .map(line => {
      // Check single line comment
      const commentIdx = line.indexOf('//');
      let codePart = commentIdx !== -1 ? line.substring(0, commentIdx) : line;
      let commentPart = commentIdx !== -1 ? line.substring(commentIdx) : '';

      let escaped = escapeHtml(codePart);

      // Strings "..."
      escaped = escaped.replace(/(".*?")/g, '<span style="color:#6a8759;">$1</span>');
      // Character literals '...'
      escaped = escaped.replace(/('.*?')/g, '<span style="color:#6a8759;">$1</span>');
      // Annotations @Annotation
      escaped = escaped.replace(/(@[a-zA-Z0-9_]+)/g, '<span style="color:#bbb529;">$1</span>');
      // Keywords
      escaped = escaped.replace(keywordRegex, '<span style="color:#cc7832;font-weight:bold;">$1</span>');
      // Numbers
      escaped = escaped.replace(/\b(\d+([._]\d+)?)\b/g, '<span style="color:#6897bb;">$1</span>');

      if (commentPart) {
        escaped += `<span style="color:#808080;font-style:italic;">${escapeHtml(commentPart)}</span>`;
      }

      return escaped;
    })
    .join('\n');
}
