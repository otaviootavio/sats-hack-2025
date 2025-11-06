"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { EditorTextArea } from "~/app/playground/_components/EditorTextArea";

export function PersistentTextArea({
  chatId,
  initialValue,
  onChange,
  rows,
  placeholder,
  className,
  debounceMs = 1000,
}: {
  chatId: string;
  initialValue: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Sync local state if the server-provided initial value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const { mutate: updateChatMutate } = api.chat.update.useMutation({
    onSuccess: () => {
      dirtyRef.current = false;
    },
  });

  const scheduleSaveDebounced = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!dirtyRef.current) return;
      updateChatMutate({ chatId, source: valueRef.current });
    }, debounceMs);
  }, [updateChatMutate, chatId, debounceMs]);

  const flushSaveIfDirty = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!dirtyRef.current) return;
    updateChatMutate({ chatId, source: valueRef.current });
  }, [updateChatMutate, chatId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        updateChatMutate({ chatId, source: valueRef.current });
      }
    };
  }, [updateChatMutate, chatId]);

  return (
    <EditorTextArea
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
        dirtyRef.current = true;
        scheduleSaveDebounced();
      }}
      onBlur={flushSaveIfDirty}
      rows={rows}
      placeholder={placeholder}
      className={className}
    />
  );
}


