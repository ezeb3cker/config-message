import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { read, utils } from 'xlsx';
import { toast } from 'sonner@2.0.3';

interface FileUploadProps {
  onMessagesReceived: (messages: any) => void;
  onFileSelected: (file: File) => void;
  onSpreadsheetDataExtracted: (data: any[]) => void;
}

export function FileUpload({ onMessagesReceived, onFileSelected, onSpreadsheetDataExtracted }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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
      acc[key].mensagens.push({
        id: item.id,
        categoria: item.categoria,
        conteudo: item.conteudo
      });
      return acc;
    }, {} as Record<string, any>);

    // Converter para array e ordenar por disparo_id
    return Object.values(grouped).sort((a, b) => a.disparo_id - b.disparo_id);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv' && fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      toast.error('Por favor, selecione um arquivo CSV ou XLSX válido');
      return;
    }

    setFile(selectedFile);
    onFileSelected(selectedFile);
    setLoading(true);

    try {
      // Ler o arquivo
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(firstSheet);

      // Passar os dados extraídos da planilha para o componente pai
      onSpreadsheetDataExtracted(data);

      // Chamar o webhook
      const response = await fetch('https://dev.gruponfa.com/webhook/cvale-busca-mensagem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar mensagens do webhook');
      }

      const flatMessages = await response.json();
      
      // Agrupar mensagens por disparo_id e ordenar por id
      const groupedMessages = groupMessagesByDisparoId(flatMessages);
      
      onMessagesReceived(groupedMessages);
      toast.success('Mensagens carregadas com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
      
      // Mock data para demonstração - simulando retorno do webhook
      const mockFlatMessages = [
        { id: 1, disparo_id: 2, categoria: 'categoria 3', conteudo: 'Mensagem 3' },
        { id: 2, disparo_id: 2, categoria: 'categoria 2', conteudo: 'Mensagem 2' },
        { id: 3, disparo_id: 2, categoria: 'categoria 1', conteudo: 'Mensagem 1' },
        { id: 4, disparo_id: 1, categoria: 'categoria 3', conteudo: 'Mensagem 3' },
        { id: 5, disparo_id: 1, categoria: 'categoria 2', conteudo: 'Mensagem 2' },
        { id: 6, disparo_id: 1, categoria: 'categoria 1', conteudo: 'Mensagem 1' },
      ];
      
      const groupedMessages = groupMessagesByDisparoId(mockFlatMessages);
      onMessagesReceived(groupedMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2>Importar Arquivo</h2>
        <p className="text-muted-foreground mt-1">
          Selecione um arquivo CSV ou XLSX para carregar as mensagens
        </p>
      </div>

      <div>
        <Label htmlFor="file-upload">Arquivo</Label>
        <div className="mt-2 flex items-center gap-4">
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={loading}
            className="flex-1"
          />
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          )}
          {file && !loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-sm">{file.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}