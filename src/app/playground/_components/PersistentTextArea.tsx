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
  field = "source",
}: {
  chatId: string;
  initialValue: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  field?: "source" | "argsJson" | "witJson";
}) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousInitialValueRef = useRef(initialValue);
  const isInitialMountRef = useRef(true);

  const { mutate: updateChatMutate } = api.chat.update.useMutation({
    onSuccess: () => {
      dirtyRef.current = false;
    },
  });

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Sync local state if the server-provided initial value changes
  useEffect(() => {
    // On initial mount, just sync without saving (data loaded from database)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousInitialValueRef.current = initialValue;
      setValue(initialValue);
      return;
    }

    // If initialValue changed and it's different from current value,
    // this is likely a programmatic change (e.g., preset selection)
    // Sync the local state to match, but don't save here since the parent
    // (applySelection) already handles persistence for preset selections.
    // User typing will still trigger debounced saves via the onChange handler.
    if (initialValue !== previousInitialValueRef.current) {
      previousInitialValueRef.current = initialValue;
      // Only sync if the value actually changed (prevents unnecessary updates)
      if (initialValue !== value) {
        setValue(initialValue);
        onChange?.(initialValue);
        // Clear any pending debounced save since we're syncing from parent
        if (saveTimer.current) clearTimeout(saveTimer.current);
        // Reset dirty flag since we're syncing to match parent state
        dirtyRef.current = false;
      }
    }
  }, [initialValue, value, onChange]);

  const scheduleSaveDebounced = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!dirtyRef.current) return;
      updateChatMutate({ chatId, [field]: valueRef.current });
    }, debounceMs);
  }, [updateChatMutate, chatId, debounceMs, field]);

  const flushSaveIfDirty = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!dirtyRef.current) return;
    updateChatMutate({ chatId, [field]: valueRef.current });
  }, [updateChatMutate, chatId, field]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        updateChatMutate({ chatId, [field]: valueRef.current });
      }
    };
  }, [updateChatMutate, chatId, field]);

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


