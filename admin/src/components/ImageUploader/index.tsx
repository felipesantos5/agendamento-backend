// src/components/admin/ImageUploader.tsx

import { useState, useCallback, useEffect, DragEvent, ChangeEvent, useRef } from "react";
import { UploadCloud, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button"; //
import { Label } from "../ui/label";

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void;
  initialImageUrl?: string | null; // Para exibir uma imagem já existente (ex: ao editar)
  label?: string;
  className?: string; // Para estilização customizada do container
  aspectRatio?: "square" | "portrait" | "landscape"; // Para ajudar no estilo do preview
}

export function ImageUploader({ onFileSelect, initialImageUrl, label = "Logo/Imagem", className = "", aspectRatio = "square" }: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Se initialImageUrl mudar (ex: formulário resetado ou carregado), atualiza o preview
    setPreviewUrl(initialImageUrl || null);
    if (initialImageUrl) {
      setSelectedFile(null); // Se uma URL inicial é dada, não há arquivo local selecionado
    }
  }, [initialImageUrl]);

  useEffect(() => {
    if (!selectedFile) {
      // Se o arquivo foi removido e não havia uma initialImageUrl, limpa o preview
      if (!initialImageUrl && previewUrl?.startsWith("blob:")) {
        setPreviewUrl(null);
      }
      return;
    }
    // Cria uma URL temporária para o preview do arquivo selecionado
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Limpa a object URL quando o componente é desmontado ou o arquivo muda
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile, initialImageUrl]); // Adicionado initialImageUrl como dep.

  const handleFileProcess = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      setSelectedFile(null);
      // Volta para a imagem inicial se a seleção for inválida/limpa
      setPreviewUrl(initialImageUrl || null);
      onFileSelect(null);
      if (file) {
        // Se um arquivo foi selecionado mas não era imagem
        alert("Por favor, selecione um arquivo de imagem válido.");
      }
    }
  };

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Necessário para indicar que é uma área de drop válida
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileProcess(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect, initialImageUrl] // Adicionado initialImageUrl
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    } else {
      handleFileProcess(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null); // Remove qualquer preview, mesmo o inicial
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa o input de arquivo
    }
  };

  const aspectRatioClass = {
    square: "aspect-square",
    portrait: "aspect-[9/16]",
    landscape: "aspect-video",
  }[aspectRatio];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label htmlFor={fileInputRef.current?.id || "image-upload"}>{label}</Label>}
      {previewUrl ? (
        <div className="relative group">
          <img src={previewUrl} alt="Preview" className={`w-full h-auto max-h-60 object-contain rounded-md border ${aspectRatioClass}`} />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveImage}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      ) : (
        <div
          onClick={triggerFileInput}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer
            ${isDragging ? "border-rose-500 bg-rose-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}
            transition-colors`}
        >
          <UploadCloud className={`h-12 w-12 mb-3 ${isDragging ? "text-rose-600" : "text-gray-400"}`} />
          <p className={`text-sm ${isDragging ? "text-rose-600" : "text-gray-500"}`}>
            <span className="font-semibold">Clique para enviar</span> ou arraste e solte
          </p>
          <p className={`text-xs ${isDragging ? "text-rose-500" : "text-gray-400"}`}>PNG, JPG, GIF, WebP (MAX. 2MB)</p>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id={fileInputRef.current?.id || "image-upload-input"}
      />
      {previewUrl && !selectedFile && initialImageUrl && (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={triggerFileInput}>
          Alterar Imagem
        </Button>
      )}
    </div>
  );
}
