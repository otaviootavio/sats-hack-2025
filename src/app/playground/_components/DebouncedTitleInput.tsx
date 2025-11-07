"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { TitleInput } from "~/app/playground/_components/TitleInput";

interface DebouncedTitleInputProps {
  chatId: string;
  initialTitle: string;
}

export function DebouncedTitleInput({ chatId, initialTitle }: DebouncedTitleInputProps) {
  const [title, setTitle] = useState(initialTitle);
  const dirtyRef = useRef(false);
  const titleRef = useRef(title);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const utils = api.useUtils();
  const { mutate: updateChatMutate } = api.chat.update.useMutation({
    onSuccess: async () => {
      dirtyRef.current = false;
      await utils.chat.list.invalidate();
    },
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSaveDebounced = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!dirtyRef.current) return;
      updateChatMutate({
        chatId,
        title: titleRef.current,
      });
    }, 600);
  }, [updateChatMutate, chatId]);

  const flushSaveIfDirty = React.useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!dirtyRef.current) return;
    updateChatMutate({
      chatId,
      title: titleRef.current,
    });
  }, [updateChatMutate, chatId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <TitleInput
      value={title}
      onChange={(v) => {
        setTitle(v);
        dirtyRef.current = true;
        scheduleSaveDebounced();
      }}
      onBlur={flushSaveIfDirty}
    />
  );
}
