'use client';

import { useState } from 'react';
import { createCliente } from '@/app/clientes/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { ROTULOS_ESTAGIO } from '@/components/badges';

export function NovoClienteDialog() {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm">Novo cliente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form action={createCliente} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="razaoSocial">Razão social</Label>
            <Input id="razaoSocial" name="razaoSocial" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cnpjRaiz">CNPJ raiz</Label>
            <Input id="cnpjRaiz" name="cnpjRaiz" placeholder="00000000" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estagio">Estágio</Label>
            <NativeSelect id="estagio" name="estagio" defaultValue="PROSPECT">
              {Object.entries(ROTULOS_ESTAGIO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="contatoNome">Contato (nome)</Label>
            <Input id="contatoNome" name="contatoNome" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="contatoEmail">Contato (e-mail)</Label>
            <Input id="contatoEmail" name="contatoEmail" type="email" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label htmlFor="percentualExito">% de êxito contratado</Label>
            <Input id="percentualExito" name="percentualExito" type="number" min={0} max={100} defaultValue={25} />
          </div>
          <div className="col-span-2 flex justify-end pt-2">
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
