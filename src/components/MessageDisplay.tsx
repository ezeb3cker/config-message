import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface Message {
  id: number;
  categoria: string;
  conteudo: string;
}

interface MessageGroup {
  disparo_id: number;
  mensagens: Message[];
}

interface MessageDisplayProps {
  messages: MessageGroup[];
  onSelectMessage: (selected: MessageGroup | null) => void;
}

export function MessageDisplay({ messages, onSelectMessage }: MessageDisplayProps) {
  const [selectedDisparoId, setSelectedDisparoId] = useState<string>('');

  const handleSelectionChange = (value: string) => {
    setSelectedDisparoId(value);
    const selected = messages.find(group => group.disparo_id.toString() === value);
    onSelectMessage(selected || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Definir Mensagem</h2>
        <p className="text-muted-foreground mt-1">
          Selecione a mensagem que deseja disparar
        </p>
      </div>

      <ScrollArea className="h-[600px] rounded-md border p-4">
        <RadioGroup value={selectedDisparoId} onValueChange={handleSelectionChange}>
          <div className="space-y-6">
            {messages.map((group, index) => (
              <div key={group.disparo_id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={group.disparo_id.toString()}
                    id={`group-${group.disparo_id}`}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    <Label
                      htmlFor={`group-${group.disparo_id}`}
                      className="cursor-pointer"
                    >
                      Grupo de Mensagens #{index + 1}
                    </Label>
                    
                    <div className="pl-4 space-y-3 border-l-2 border-muted">
                      {group.mensagens.map((msg) => (
                        <div key={msg.id} className="space-y-1">
                          <p className="font-medium">{msg.categoria}</p>
                          <p className="text-muted-foreground">{msg.conteudo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {index < messages.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        </RadioGroup>
      </ScrollArea>
    </div>
  );
}