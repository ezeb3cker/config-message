import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { read, utils } from 'xlsx';
import { toast } from 'sonner@2.0.3';

interface FileUploadProps {
  onFileSelected: (file: File | null) => void;
  onSpreadsheetDataExtracted: (data: any[]) => void;
  uploadedFile: File | null;
}

export function FileUpload({ onFileSelected, onSpreadsheetDataExtracted, uploadedFile }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado interno quando uploadedFile é resetado
  useEffect(() => {
    if (uploadedFile === null) {
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [uploadedFile]);

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
      
      toast.success('Arquivo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2>Importar Arquivo</h2>
        <p className="text-muted-foreground mt-1">
          Selecione um arquivo CSV ou XLSX com os dados para disparo
        </p>
      </div>

      <div>
        <Label htmlFor="file-upload">Arquivo</Label>
        <div className="mt-2 flex items-center gap-4">
          <Input
            ref={inputRef}
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
