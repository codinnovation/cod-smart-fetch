import { useState, useCallback, useRef, useEffect } from 'react';
import { useSmartFetchConfig } from './context/SmartFetchContext';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface UseSmartFetchOptions<T> {
    url?: string;
    method?: HttpMethod;
    headers?: HeadersInit;
    body?: any;
    autoFetch?: boolean;
    debounce?: number;
}

export interface FetchState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
}

export interface UseSmartFetchResult<T> extends FetchState<T> {
    execute: (options?: UseSmartFetchOptions<T>) => Promise<T | null>;
    get: (url: string, headers?: HeadersInit) => Promise<T | null>;
    post: (url: string, body: any, headers?: HeadersInit) => Promise<T | null>;
    put: (url: string, body: any, headers?: HeadersInit) => Promise<T | null>;
    patch: (url: string, body: any, headers?: HeadersInit) => Promise<T | null>;
    remove: (url: string, headers?: HeadersInit) => Promise<T | null>;
    upload: (url: string, fileOrFiles: File | File[] | FormData, fieldName?: string, headers?: HeadersInit, method?: 'POST' | 'PUT') => Promise<T | null>;
}

export function useSmartFetch<T = any>(initialOptions: UseSmartFetchOptions<T> = {}): UseSmartFetchResult<T> {
    const config = useSmartFetchConfig();

    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        isLoading: !!((initialOptions.autoFetch || config.autoFetch) && (initialOptions.url || config.baseUrl)),
    });

    const optionsRef = useRef(initialOptions);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        optionsRef.current = initialOptions;
    }, [initialOptions]);

    const execute = useCallback(async (options: UseSmartFetchOptions<T> = {}) => {
        const mergedOptions = { ...optionsRef.current, ...options };
        let { url, method = 'GET', headers = {}, body } = mergedOptions;

        // Use baseUrl if provided and url is relative
        if (config.baseUrl && url && !url.startsWith('http')) {
            // Ensure no double slashes
            const base = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
            const path = url.startsWith('/') ? url : `/${url}`;
            url = `${base}${path}`;
        }

        if (!url) {
            console.error("useSmartFetch: URL is required");
            return null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            let fetchOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...config.headers, // Global headers
                    ...headers, // Per-request headers override global
                },
                signal: abortControllerRef.current.signal,
            };

            if (body) {
                if (body instanceof FormData) {
                    // If body is FormData, let browser set Content-Type
                    // We need to cast headers to any or Record to check/delete
                    // But HeadersInit can be Headers object too.

                    // Simplest way: don't include Content-Type if it's FormData
                    if (fetchOptions.headers && 'Content-Type' in (fetchOptions.headers as any)) {
                        delete (fetchOptions.headers as any)['Content-Type'];
                    }
                    // Also remove from global headers if merged? 
                    // Better approach:
                    const h = { ...config.headers, ...headers } as Record<string, string>;
                    delete h['Content-Type'];
                    fetchOptions.headers = h;

                    fetchOptions.body = body;
                } else if (method !== 'GET') {
                    fetchOptions.body = JSON.stringify(body);
                }
            }

            // Request Interceptor
            if (config.interceptors?.request) {
                fetchOptions = await config.interceptors.request(fetchOptions);
            }

            let response = await fetch(url, fetchOptions);

            // Response Interceptor
            if (config.interceptors?.response) {
                response = await config.interceptors.response(response);
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setState({ data, error: null, isLoading: false });

            if (config.onSuccess) config.onSuccess(data);

            return data;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                return null;
            }
            setState({ data: null, error, isLoading: false });

            if (config.onError) config.onError(error);

            return null;
        }
    }, [config]);

    const stringifiedOptions = JSON.stringify(initialOptions);

    useEffect(() => {
        const toggle = initialOptions.autoFetch || config.autoFetch;
        if (toggle) {
            if (initialOptions.url) {
                const timeoutId = setTimeout(() => {
                    execute();
                }, initialOptions.debounce || 0);

                return () => {
                    clearTimeout(timeoutId);
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                };
            }
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [stringifiedOptions, execute, config.autoFetch]);

    const get = useCallback((url: string, headers?: HeadersInit) => execute({ url, method: 'GET', headers }), [execute]);
    const post = useCallback((url: string, body: any, headers?: HeadersInit) => execute({ url, method: 'POST', body, headers }), [execute]);
    const put = useCallback((url: string, body: any, headers?: HeadersInit) => execute({ url, method: 'PUT', body, headers }), [execute]);
    const patch = useCallback((url: string, body: any, headers?: HeadersInit) => execute({ url, method: 'PATCH', body, headers }), [execute]);
    const remove = useCallback((url: string, headers?: HeadersInit) => execute({ url, method: 'DELETE', headers }), [execute]);

    const upload = useCallback((
        url: string,
        fileOrFiles: File | File[] | FormData,
        fieldName: string = 'file',
        headers: HeadersInit = {},
        method: 'POST' | 'PUT' = 'POST'
    ) => {
        let body: FormData;

        if (fileOrFiles instanceof FormData) {
            body = fileOrFiles;
        } else {
            body = new FormData();
            if (Array.isArray(fileOrFiles)) {
                fileOrFiles.forEach(file => body.append(fieldName, file));
            } else {
                body.append(fieldName, fileOrFiles as File);
            }
        }

        return execute({ url, method, body, headers });
    }, [execute]);

    return {
        ...state,
        execute,
        get,
        post,
        put,
        patch,
        remove,
        upload,
    };
}

export { SmartFetchProvider } from './context/SmartFetchContext';
export default useSmartFetch;
