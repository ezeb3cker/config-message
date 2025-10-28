import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: number;
  categoria: string;
  conteudo: string;
}

interface MessageGroup {
  disparo_id: number;
  mensagens: Message[];
}

interface CreateMessageGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxDisparoId: number;
  onCreate: (newGroup: MessageGroup) => void;
}

const CATEGORIAS_PREDEFINIDAS = [
  'Associado/Cliente',
  'Estudante',
  'Fornecedor',
  'Visitante',
  'Funcionário'
];

export function CreateMessageGroupDialog({ 
  open, 
  onOpenChange, 
  maxDisparoId, 
  onCreate 
}: CreateMessageGroupDialogProps) {
  const [mensagens, setMensagens] = useState<Record<string, string>>(
    CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
  );
  const [creating, setCreating] = useState(false);

  const updateConteudo = (categoria: string, value: string) => {
    setMensagens(prev => ({
      ...prev,
      [categoria]: value
    }));
  };

  const handleCreate = async () => {
    // Validar se pelo menos uma mensagem foi preenchida
    const hasContent = Object.values(mensagens).some(content => content.trim() !== '');
    
    if (!hasContent) {
      toast.error('Preencha pelo menos uma mensagem para criar o grupo');
      return;
    }

    setCreating(true);

    try {
      const novoDisparoId = maxDisparoId + 1;
      
      // Criar array de mensagens apenas com as que têm conteúdo
      const mensagensArray: Message[] = CATEGORIAS_PREDEFINIDAS
        .map((categoria, index) => ({
          id: (maxDisparoId * 10) + index + 1, // Gerar IDs únicos baseados no disparo_id
          categoria,
          conteudo: mensagens[categoria]
        }))
        .filter(msg => msg.conteudo.trim() !== '');

      const novoGrupo: MessageGroup = {
        disparo_id: novoDisparoId,
        mensagens: mensagensArray
      };

      // Enviar para o webhook
      const response = await fetch('https://dev.gruponfa.com/webhook/860274ef-1be7-44f0-8135-bb69f70265ce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novoGrupo),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar grupo de mensagens');
      }

      const result = await response.json();
      
      // Verificar se a API retornou success
      if (result && Array.isArray(result) && result[0]?.success) {
        onCreate(novoGrupo);
        toast.success('Grupo de mensagens criado com sucesso!');
        
        // Limpar formulário
        setMensagens(
          CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
        );
        
        onOpenChange(false);
      } else {
        throw new Error('Resposta inesperada da API');
      }
    } catch (error) {
      console.error('Erro ao criar grupo de mensagens:', error);
      toast.error('Erro ao criar grupo de mensagens. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    // Limpar formulário ao cancelar
    setMensagens(
      CATEGORIAS_PREDEFINIDAS.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        {/* Loading Overlay */}
        {creating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Criando grupo de mensagens...</p>
            <p className="text-sm text-muted-foreground mt-2">Aguarde enquanto processamos sua solicitação</p>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Criar Grupo de Mensagens</DialogTitle>
          <DialogDescription>
            Preencha o conteúdo para cada categoria. Deixe em branco as categorias que não deseja incluir.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {CATEGORIAS_PREDEFINIDAS.map((categoria) => (
              <div key={categoria} className="space-y-4 p-4 border rounded-lg">
                <h4>Categoria {categoria}</h4>

                <div className="space-y-2">
                  <Label htmlFor={`conteudo-${categoria}`}>Conteúdo</Label>
                  <Textarea
                    id={`conteudo-${categoria}`}
                    value={mensagens[categoria]}
                    onChange={(e) => updateConteudo(categoria, e.target.value)}
                    placeholder={`Digite o conteúdo da mensagem para ${categoria}`}
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
            onClick={handleCancel}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
