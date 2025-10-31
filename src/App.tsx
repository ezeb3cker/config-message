import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { MessageSelector } from './components/MessageSelector';
import { CreateMessageGroupDialog } from './components/CreateMessageGroupDialog';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Send, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function App() {
  const [messages, setMessages] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Função para agrupar mensagens por disparo_id e ordenar por id
  const groupMessagesByDisparoId = (flatMessages: any[]) => {
    // Ordenar por id primeiro
    const sortedMessages = [...flatMessages].sort((a, b) => a.id - b.id);
    
    // Agrupar por disparo_id
    const grouped = sortedMessages.reduce((acc, item) => {
      const key = item.disparo_id.toString();
      if (!acc[key]) {
        acc[key] = {
          disparo_id: item.disparo_id,
          mensagens: []
        };
      }

      // Parse do campo conteudo se vier como string JSON
      let messageData = {
        conteudo: item.conteudo,
        midiaExtension: item.midiaExtension,
        midiaBase64: item.midiaBase64
      };

      try {
        // Tentar fazer parse do conteudo como JSON
        if (typeof item.conteudo === 'string' && item.conteudo.trim().startsWith('[')) {
          const parsedContent = JSON.parse(item.conteudo);
          
          // Se for um array, pegar o primeiro elemento
          if (Array.isArray(parsedContent) && parsedContent.length > 0) {
            const contentObj = parsedContent[0];
            messageData = {
              conteudo: contentObj.messageText || '',
              midiaExtension: contentObj.midiaExtension || undefined,
              midiaBase64: contentObj.midiaBase64 || undefined
            };
          }
        }
      } catch (e) {
        // Se não for JSON válido, manter os valores originais
        console.warn('Não foi possível fazer parse do conteudo:', e);
      }

      acc[key].mensagens.push({
        id: item.id,
        categoria: item.categoria,
        conteudo: messageData.conteudo,
        midiaExtension: messageData.midiaExtension,
        midiaBase64: messageData.midiaBase64
      });
      return acc;
    }, {} as Record<string, any>);

    // Converter para array e ordenar por disparo_id
    return Object.values(grouped).sort((a, b) => a.disparo_id - b.disparo_id);
  };

  // Carregar mensagens automaticamente ao montar o componente
  useEffect(() => {
    const fetchMessages = async () => {
      setLoadingMessages(true);

      try {
        const response = await fetch('https://dev.gruponfa.com/webhook/cvale-busca-mensagem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data: [] }), // Enviar array vazio para buscar todas as mensagens
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar mensagens do webhook');
        }

        const flatMessages = await response.json();
        
        // Se a resposta for um array vazio ou não houver mensagens, definir como array vazio
        if (Array.isArray(flatMessages) && flatMessages.length > 0) {
          const groupedMessages = groupMessagesByDisparoId(flatMessages);
          setMessages(groupedMessages);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        toast.error('Erro ao buscar mensagens.');
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, []);

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
      
      // Reiniciar a tela após 3 segundos
      setTimeout(() => {
        setUploadedFile(null);
        setSpreadsheetData([]);
        setSelectedMessage(null);
        setDispatchSuccess(false);
        toast.info('Importe uma nova planilha para continuar');
      }, 3000);
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
            Importe um arquivo CSV ou XLSX para disparar mensagens
          </p>
        </div>

        <div className="grid gap-6">
          {/* Upload de Arquivo */}
          <Card className="p-6">
            <FileUpload 
              uploadedFile={uploadedFile}
              onFileSelected={setUploadedFile}
              onSpreadsheetDataExtracted={setSpreadsheetData}
            />
          </Card>

          {/* Definir Mensagem - só aparece após importar arquivo */}
          {uploadedFile && (
            <>
              {loadingMessages ? (
                <Card className="p-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">Carregando mensagens disponíveis...</p>
                    </div>
                  </div>
                </Card>
              ) : messages && messages.length > 0 ? (
                <Card className="p-6">
                  <MessageSelector 
                    messages={messages}
                    onSelectMessage={setSelectedMessage}
                    onUpdateMessage={handleUpdateMessage}
                    onCreateMessage={handleCreateMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                </Card>
              ) : messages && messages.length === 0 ? (
                <Card className="p-6">
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        Nenhum grupo de mensagens cadastrado
                      </p>
                      <Button
                        onClick={() => setCreateDialogOpen(true)}
                        size="lg"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Grupo de Mensagens
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}
              
              {/* Dialog de Criação - usado quando não há mensagens */}
              {messages && messages.length === 0 && (
                <CreateMessageGroupDialog
                  open={createDialogOpen}
                  onOpenChange={setCreateDialogOpen}
                  maxDisparoId={0}
                  onCreate={handleCreateMessage}
                />
              )}
            </>
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