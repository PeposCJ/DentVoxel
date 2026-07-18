import { describe, expect, it } from 'vitest';
import { localize, translate } from './i18n';

describe('translations', () => {
  it('uses English and Spanish messages from the same key', () => {
    expect(translate('en', 'openStudy')).toBe('Open study');
    expect(translate('es', 'openStudy')).toBe('Abrir estudio');
  });

  it('interpolates dynamic DICOM metadata safely', () => {
    const message = { key: 'unsupportedSyntaxReason', values: { syntax: '9.9.9' } } as const;
    expect(localize('en', message)).toContain('9.9.9');
    expect(localize('es', message)).toContain('9.9.9');
  });
});
