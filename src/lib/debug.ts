type DebugLevel = 'info' | 'warn' | 'error';

type DebugDetails = Record<string, unknown>;

const isDebugEnabled = () => {
  const envFlag = import.meta.env.VITE_DEBUG_ACTIONS;
  const envEnabled = envFlag === 'true' || envFlag === '1';
  const localFlag =
    typeof window !== 'undefined' ? window.localStorage.getItem('debug:actions') : null;

  return import.meta.env.DEV || envEnabled || localFlag === 'true';
};

const cleanDetails = (value: unknown): unknown => {
  if (value instanceof File) {
    return {
      name: value.name,
      type: value.type,
      size: value.size,
      lastModified: value.lastModified,
    };
  }

  if (value instanceof Blob) {
    return {
      type: value.type,
      size: value.size,
    };
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(cleanDetails);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cleanDetails(entry)])
    );
  }

  return value;
};

export function debugAction(scope: string, label: string, details: DebugDetails = {}, level: DebugLevel = 'info') {
  if (!isDebugEnabled()) return;

  const payload = {
    at: new Date().toISOString(),
    ...(cleanDetails(details) as DebugDetails),
  };

  const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  method(`[debug:${scope}] ${label}`, payload);
}

export function debugError(scope: string, label: string, error: unknown, details: DebugDetails = {}) {
  debugAction(scope, label, { ...details, error }, 'error');
}
