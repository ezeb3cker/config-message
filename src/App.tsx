import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { MessageSelector } from './components/MessageSelector';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function App() {
  const [messages, setMessages] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);

  const handleUpdateMessage = (updatedGroup: any) => {
    // Atualizar a lista de mensagens com o grupo editado
    if (messages) {
      const updatedMessages = messages.map((group: any) =>
        group.disparo_id === updatedGroup.disparo_id ? updatedGroup : group
      );
      setMessages(updatedMessages);
      
      // Se a mensagem selecionada foi editada, atualizar também
      if (selectedMessage?.disparo_id === updatedGroup.disparo_id) {
        setSelectedMessage(updatedGroup);
      }
    }
  };

  const handleCreateMessage = (newGroup: any) => {
    // Adicionar novo grupo à lista de mensagens
    if (messages) {
      const updatedMessages = [...messages, newGroup];
      setMessages(updatedMessages);
      toast.success('Novo grupo adicionado à lista!');
    }
  };

  const handleDeleteMessage = (deletedGroup: any) => {
    // Remover grupo da lista de mensagens
    if (messages) {
      const updatedMessages = messages.filter((group: any) => 
        group.disparo_id !== deletedGroup.disparo_id
      );
      setMessages(updatedMessages);
      
      // Se a mensagem selecionada foi excluída, desmarcar
      if (selectedMessage?.disparo_id === deletedGroup.disparo_id) {
        setSelectedMessage(null);
      }
      
      toast.success('Grupo de mensagens excluído com sucesso!');
    }
  };

  const handleDispatch = async () => {
    if (!selectedMessage) {
      toast.error('Nenhuma mensagem selecionada para disparar');
      return;
    }

    if (spreadsheetData.length === 0) {
      toast.error('Nenhum dado da planilha foi carregado');
      return;
    }

    setDispatching(true);
    setDispatchSuccess(false);

    try {
      // Enviar os dados da planilha e disparo_id como JSON
      const payload = {
        disparo_id: selectedMessage.disparo_id,
        data: spreadsheetData
      };

      const response = await fetch('https://dev.gruponfa.com/webhook/cda6b77f-ab64-4919-8068-87cd81663149', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao disparar mensagens');
      }

      // A resposta deve ser um array de resultados
      const results = await response.json();
      
      // Verificar se temos resultados válidos com status e msg
      if (Array.isArray(results)) {
        const successCount = results.filter(r => r.status === "202").length;
        
        if (successCount === results.length) {
          toast.success(`Todas as ${successCount} mensagens foram disparadas com sucesso!`);
        } else {
          const failedCount = results.length - successCount;
          toast.warning(`${successCount} mensagens enviadas, ${failedCount} falharam`);
        }
      } else {
        toast.success('Mensagens disparadas com sucesso!');
      }
      
      setDispatchSuccess(true);
    } catch (error) {
      console.error('Erro ao disparar mensagem:', error);
      toast.error('Erro ao disparar mensagem. Tente novamente.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1>Sistema de Disparo de Mensagens</h1>
          <p className="text-muted-foreground mt-2">
            Importe um arquivo CSV ou XLSX para buscar e disparar mensagens
          </p>
        </div>

        <div className="grid gap-6">
          {/* Upload de Arquivo */}
          <Card className="p-6">
            <FileUpload 
              onMessagesReceived={setMessages}
              onFileSelected={setUploadedFile}
              onSpreadsheetDataExtracted={setSpreadsheetData}
            />
          </Card>

          {/* Definir Mensagem */}
          {messages && (
            <Card className="p-6">
              <MessageSelector 
                messages={messages}
                onSelectMessage={setSelectedMessage}
                onUpdateMessage={handleUpdateMessage}
                onCreateMessage={handleCreateMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Botão Fixo de Disparar */}
      {messages && selectedMessage && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <Button
              onClick={handleDispatch}
              disabled={dispatching}
              className="w-full"
              size="lg"
            >
              {dispatching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disparando Mensagens...
                </>
              ) : dispatchSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mensagens Disparadas com Sucesso
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Disparar Mensagens
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}