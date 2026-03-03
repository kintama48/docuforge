/**
 * Regression tests for Frontend security issues identified in SQA audit
 *
 * FE-C1: useEffect must not include previewRender in dependencies (infinite loop risk)
 * FE-C2: localStorage token storage must be documented
 * FE-C3: Monaco editor types must not use 'any'
 * FE-C4: redirect params must be sanitized to internal paths
 * FE-C5: authenticated shell must expose an explicit logout action
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const srcPath = path.resolve(__dirname, '../../src');

describe('Frontend Security Regressions', () => {
  describe('FE-C1: useEffect dependency array fix', () => {
    test('EditorPage uses ref pattern for previewRender.mutate', () => {
      const editorPagePath = path.join(srcPath, 'views/editor/EditorPage.tsx');
      const source = fs.readFileSync(editorPagePath, 'utf-8');

      // Should use a ref to store the mutate function
      expect(source).toContain('previewRenderRef');
      expect(source).toContain('useRef(previewRender.mutate)');

      // The auto-render useEffect should NOT have previewRender in deps
      // Look for the useEffect that calls previewRenderRef.current
      expect(source).toContain('previewRenderRef.current({');

      // Verify the dangerous pattern is removed
      expect(source).not.toMatch(/\[.*previewRender\]/);
    });
  });

  describe('FE-C2: localStorage security documentation', () => {
    test('auth store has security documentation', () => {
      const authStorePath = path.join(srcPath, 'stores/auth.ts');
      const source = fs.readFileSync(authStorePath, 'utf-8');

      // Should contain security documentation
      expect(source).toContain('SECURITY NOTE');
      expect(source).toContain('XSS');
      expect(source).toContain('localStorage');

      // Should document mitigations
      expect(source).toContain('Mitigations');
    });
  });

  describe('FE-C3: Monaco types', () => {
    test('editor store uses proper Monaco types', () => {
      const editorStorePath = path.join(srcPath, 'stores/editor.ts');
      const source = fs.readFileSync(editorStorePath, 'utf-8');

      // Should import Monaco types
      expect(source).toContain('import type * as Monaco from "monaco-editor"');

      // Should NOT have 'any' for editor instances
      expect(source).not.toMatch(/editorInstance:\s*any/);
      expect(source).not.toMatch(/monacoInstance:\s*any/);

      // Should use typed definitions
      expect(source).toContain('MonacoEditor');
      expect(source).toContain('MonacoInstance');
    });

    test('MonacoEditor component uses proper types', () => {
      const monacoEditorPath = path.join(srcPath, 'components/editor/MonacoEditor.tsx');
      const source = fs.readFileSync(monacoEditorPath, 'utf-8');

      // Should import Monaco types
      expect(source).toContain('import type * as MonacoType from "monaco-editor"');

      // Should NOT have 'any' for refs
      expect(source).not.toMatch(/useRef<any>/);

      // Should have typed refs
      expect(source).toContain('useRef<MonacoEditor');
    });
  });

  describe('FE-C4: redirect sanitization', () => {
    test('redirect sanitizer rejects external redirects', () => {
      const redirectPath = path.join(srcPath, 'lib/redirect.ts');
      const source = fs.readFileSync(redirectPath, 'utf-8');

      expect(source).toContain('sanitizeAppRedirect');
      expect(source).toContain("startsWith(\"//\")");
      expect(source).toContain("includes(\"\\\\\")");
    });
  });

  describe('FE-C5: explicit logout control', () => {
    test('TopBar includes logout action in authenticated shell', () => {
      const topBarPath = path.join(srcPath, 'components/layout/TopBar.tsx');
      const source = fs.readFileSync(topBarPath, 'utf-8');

      expect(source).toContain('Log out');
      expect(source).toContain('useAuthStore');
      expect(source).toContain('logout');
    });
  });

  describe('FE-M3: Keyboard shortcuts ref pattern', () => {
    test('useKeyboard uses ref to avoid event listener churn', () => {
      const hookPath = path.join(srcPath, 'hooks/use-keyboard.ts');
      const source = fs.readFileSync(hookPath, 'utf-8');

      // Should use useRef for shortcuts
      expect(source).toContain('shortcutsRef');
      expect(source).toContain('useRef');

      // useEffect should NOT depend on shortcuts directly
      expect(source).not.toMatch(/\[shortcuts,?\s*enabled\]/);
    });
  });

  describe('FE-M4: Typst decorations optimization', () => {
    test('typst-decorations uses pre-compiled regexes', () => {
      const decoPath = path.join(srcPath, 'lib/typst-decorations.ts');
      const source = fs.readFileSync(decoPath, 'utf-8');

      // Should define regexes outside the function
      expect(source).toMatch(/^const (HEADING_RE|BOLD_RE|ITALIC_RE|FUNCTION_RE)/m);

      // Should NOT use 'any' types
      expect(source).not.toMatch(/model:\s*any/);
      expect(source).not.toMatch(/monaco:\s*any/);
    });
  });

  describe('FE-M5: Monaco command cleanup', () => {
    test('use-monaco-formatting disposes command handlers', () => {
      const hookPath = path.join(srcPath, 'hooks/use-monaco-formatting.ts');
      const source = fs.readFileSync(hookPath, 'utf-8');

      // Should guard duplicate registration and reset editor binding in cleanup
      expect(source).toContain('commandEditorRef');
      expect(source).toContain('if (commandEditorRef.current === editor) return;');
      expect(source).toContain('commandEditorRef.current = null;');
    });
  });

  describe('FE-m2: Timestamp detection', () => {
    test('formatDate uses digit-count approach (not magic year cutoff)', () => {
      const utilsPath = path.join(srcPath, 'lib/utils.ts');
      const source = fs.readFileSync(utilsPath, 'utf-8');

      // Should NOT use a hardcoded timestamp threshold
      expect(source).not.toContain('1_000_000_000_000');

      // Should use digit-count or string length approach
      expect(source).toContain('String(Math.floor(timestamp)).length');
    });
  });

  describe('FE-m3: planLimits type consistency', () => {
    test('planLimits uses number | null (not string) for limits', () => {
      const constantsPath = path.join(srcPath, 'lib/constants.ts');
      const source = fs.readFileSync(constantsPath, 'utf-8');

      // Should NOT use string values like "Unlimited" or "Custom" in data
      expect(source).not.toMatch(/renders:\s*"(Unlimited|Custom)"/);
      expect(source).not.toMatch(/templates:\s*"(Unlimited|Custom)"/);
      expect(source).not.toMatch(/aiCredits:\s*"(Unlimited|Custom)"/);

      // Should use null for unlimited
      expect(source).toContain('templates: null');
    });
  });

  describe('FE-m4: Single-file explorer mode', () => {
    test('FileExplorer avoids destructive file controls and native confirm()', () => {
      const explorerPath = path.join(srcPath, 'components/editor/FileExplorer.tsx');
      const source = fs.readFileSync(explorerPath, 'utf-8');

      expect(source).toContain('setActiveFile("main.typ")');
      expect(source).toContain('Single-file mode is enabled for a simpler editing flow.');
      expect(source).not.toContain('window.confirm(');
      expect(source).not.toContain('setDeleteTarget(');
    });
  });

  describe('FE-M6: Completion provider cleanup', () => {
    test('MonacoEditor disposes completion provider', () => {
      const editorPath = path.join(srcPath, 'components/editor/MonacoEditor.tsx');
      const source = fs.readFileSync(editorPath, 'utf-8');

      // Should store completion provider disposable
      expect(source).toContain('completionProviderRef');
    });

    test('registerTypstCompletions returns disposable', () => {
      const typstPath = path.join(srcPath, 'lib/typst.ts');
      const source = fs.readFileSync(typstPath, 'utf-8');

      // Should return the provider registration
      expect(source).toContain('return monaco.languages.registerCompletionItemProvider');
    });
  });
});
