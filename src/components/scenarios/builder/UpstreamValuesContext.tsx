"use client";

import * as React from "react";

type MapperRegistry = Map<string, (token: string) => void>;

type UpstreamValuesContextValue = {
  registerMapper: (id: string, insert: (token: string) => void) => () => void;
  setFocusedMapper: (id: string) => void;
  insertAtFocused: (token: string) => void;
};

const UpstreamValuesContext = React.createContext<UpstreamValuesContextValue | null>(
  null,
);

export function UpstreamValuesProvider({ children }: { children: React.ReactNode }) {
  const registryRef = React.useRef<MapperRegistry>(new Map());
  const focusedMapperRef = React.useRef<string | null>(null);

  const value = React.useMemo<UpstreamValuesContextValue>(
    () => ({
      registerMapper: (id, insert) => {
        registryRef.current.set(id, insert);
        return () => {
          registryRef.current.delete(id);
          if (focusedMapperRef.current === id) focusedMapperRef.current = null;
        };
      },
      setFocusedMapper: (id) => {
        focusedMapperRef.current = id;
      },
      insertAtFocused: (token) => {
        const focusedId = focusedMapperRef.current;
        const insert =
          (focusedId ? registryRef.current.get(focusedId) : undefined) ??
          Array.from(registryRef.current.values()).at(-1);
        insert?.(token);
      },
    }),
    [],
  );

  return (
    <UpstreamValuesContext.Provider value={value}>
      {children}
    </UpstreamValuesContext.Provider>
  );
}

export function useUpstreamValues() {
  return React.useContext(UpstreamValuesContext);
}
