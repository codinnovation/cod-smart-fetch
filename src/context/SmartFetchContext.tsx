import React, { createContext, useContext, ReactNode } from 'react';

export interface Interceptors {
    request?: (options: RequestInit) => Promise<RequestInit> | RequestInit;
    response?: (response: Response) => Promise<Response> | Response;
}

export interface SmartFetchConfig {
    baseUrl?: string;
    headers?: HeadersInit;
    autoFetch?: boolean;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    interceptors?: Interceptors;
}

const SmartFetchContext = createContext<SmartFetchConfig>({});

export const SmartFetchProvider = ({ children, config }: { children: ReactNode; config: SmartFetchConfig }) => {
    return (
        <SmartFetchContext.Provider value={config}>
            {children}
        </SmartFetchContext.Provider>
    );
};

export const useSmartFetchConfig = () => useContext(SmartFetchContext);
