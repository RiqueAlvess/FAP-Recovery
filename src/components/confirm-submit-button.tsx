'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

/** Botão de submit dentro de um <form action={serverAction}> que pede confirmação antes de disparar ações destrutivas. */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: { confirmMessage: string } & ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
