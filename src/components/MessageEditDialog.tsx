import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: number;
  categoria: string;
  conteudo: string;
  midiaExtension?: string;
  midiaBase64?: string;
}

interface MessageGroup {
  disparo_id: number;
  mensagens: Message[];
}

interface MessageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageGroup: MessageGroup | null;
  onSave: (updatedGroup: MessageGroup) => void;
}

export function MessageEditDialog({ open, onOpenChange, messageGroup, onSave }: MessageEditDialogProps) {
  const [editedGroup, setEditedGroup] = useState<MessageGroup | null>(null);
  const [originalGroup, setOriginalGroup] = useState<MessageGroup | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (messageGroup) {
      // Criar uma cópia profunda para edição
      const groupCopy = {
        ...messageGroup,
        mensagens: messageGroup.mensagens.map(msg => ({ ...msg }))
      };
      setEditedGroup(groupCopy);
      // Manter uma cópia dos valores originais para comparação
      setOriginalGroup(JSON.parse(JSON.stringify(groupCopy)));
    }
  }, [messageGroup]);

  const updateMessage = (index: number, value: string) => {
    if (!editedGroup) return;
    
    const updatedMessages = [...editedGroup.mensagens];
    updatedMessages[index] = {
      ...updatedMessages[index],
      conteudo: value
    };
    
    setEditedGroup({
      ...editedGroup,
      mensagens: updatedMessages
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!editedGroup) return;

    // Validar tipo de arquivo (imagens, vídeos, PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use imagens, vídeos MP4 ou PDF.');
      return;
    }

    // Limitar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O tamanho máximo é 10MB.');
      return;
    }

    try {
      // Converter para base64
      const base64 = await fileToBase64(file);
      
      // Obter extensão
      const extension = '.' + file.name.split('.').pop();

      const updatedMessages = [...editedGroup.mensagens];
      updatedMessages[index] = {
        ...updatedMessages[index],
        midiaExtension: extension,
        midiaBase64: base64
      };

      setEditedGroup({
        ...editedGroup,
        mensagens: updatedMessages
      });

      toast.success('Mídia anexada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
    }
  };

  const removeMedia = (index: number) => {
    if (!editedGroup) return;

    const updatedMessages = [...editedGroup.mensagens];
    updatedMessages[index] = {
      ...updatedMessages[index],
      midiaExtension: undefined,
      midiaBase64: undefined
    };

    setEditedGroup({
      ...editedGroup,
      mensagens: updatedMessages
    });

    toast.success('Mídia removida com sucesso!');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo data:...;base64,
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSave = async () => {
    if (!editedGroup || !originalGroup) return;

    setSaving(true);

    try {
      // Identificar apenas as mensagens que foram modificadas
      const modifiedMessages = editedGroup.mensagens.filter((editedMsg, index) => {
        const originalMsg = originalGroup.mensagens[index];
        return editedMsg.conteudo !== originalMsg.conteudo || 
               editedMsg.categoria !== originalMsg.categoria ||
               editedMsg.midiaExtension !== originalMsg.midiaExtension ||
               editedMsg.midiaBase64 !== originalMsg.midiaBase64;
      });

      // Só enviar para o webhook se houver mensagens modificadas
      if (modifiedMessages.length > 0) {
        // Formatar mensagens para o formato da API
        const formattedMessages = modifiedMessages.map(msg => ({
          id: msg.id,
          categoria: msg.categoria,
          midiaExtension: msg.midiaExtension || null,
          midiaBase64: msg.midiaBase64 || null,
          messageText: msg.conteudo
        }));

        const dataToSend = {
          disparo_id: editedGroup.disparo_id,
          mensagens: formattedMessages
        };

        const response = await fetch('https://dev.gruponfa.com/webhook/cebc0f41-ee3a-4d94-8167-e76c29b1e429', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
          throw new Error('Erro ao atualizar mensagens');
        }

        toast.success(`${modifiedMessages.length} mensagem(ns) atualizada(s) com sucesso!`);
      } else {
        toast.info('Nenhuma alteração foi feita');
      }

      // Sempre atualizar localmente com todas as mensagens do grupo
      onSave(editedGroup);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
      toast.error('Erro ao atualizar mensagens. Tente novamente.');
      
      // Para fins de demonstração, ainda permite salvar localmente
      onSave(editedGroup);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!editedGroup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        {/* Loading Overlay */}
        {saving && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Salvando alterações...</p>
            <p className="text-sm text-muted-foreground mt-2">Aguarde enquanto processamos sua solicitação</p>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Editar Mensagens</DialogTitle>
          <DialogDescription>
            Edite as mensagens do grupo. As alterações serão enviadas para o webhook.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {editedGroup.mensagens.map((msg, index) => (
              <div key={msg.id} className="space-y-4 p-4 border rounded-lg">
                <h4>Categoria {msg.categoria}</h4>

                {/* Upload de Mídia */}
                <div className="space-y-2">
                  <Label>Mídia (opcional)</Label>
                  {msg.midiaBase64 ? (
                    <div className="relative border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">
                          Arquivo anexado: {msg.midiaExtension}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Preview da mídia */}
                      {msg.midiaExtension?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                        <img
                          src={`data:image/${msg.midiaExtension.substring(1)};base64,${msg.midiaBase64}`}
                          alt="Preview"
                          className="max-w-full h-auto max-h-48 rounded"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,video/mp4,application/pdf';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(index, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Anexar Mídia
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Imagens, vídeos ou PDF (máx. 10MB)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`conteudo-${index}`}>Conteúdo</Label>
                  <Textarea
                    id={`conteudo-${index}`}
                    value={msg.conteudo}
                    onChange={(e) => updateMessage(index, e.target.value)}
                    placeholder="Digite o conteúdo da mensagem"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
