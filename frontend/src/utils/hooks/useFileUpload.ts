import { message } from 'antd';

export interface FileUploadConfig {
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  maxSize?: number;
  maxTotalSize?: number;
  customErrorMessage?: string;
  showErrorMessage?: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const useFileUpload = (config: FileUploadConfig = {}) => {
  const {
    allowedExtensions = [],
    allowedMimeTypes = [],
    maxSize = 100 * 1024 * 1024,
    maxTotalSize = 100 * 1024 * 1024,
    customErrorMessage,
    showErrorMessage = true,
  } = config;

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isImageFile = (filename: string): boolean => {
    const ext = getFileExtension(filename);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (
    file: File,
    currentTotalSize: number = 0
  ): FileValidationResult => {
    if (allowedExtensions.length > 0) {
      const ext = getFileExtension(file.name);
      if (!allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: customErrorMessage || `不支持的文件格式: .${ext}。支持格式: ${allowedExtensions.join(', ')}`,
        };
      }
    }

    if (allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(file.type)) {
        return {
          valid: false,
          error: customErrorMessage || `不支持的文件类型: ${file.type}`,
        };
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: customErrorMessage || `文件大小超过限制: ${formatFileSize(file.size)}。最大允许: ${formatFileSize(maxSize)}`,
      };
    }

    if (currentTotalSize + file.size > maxTotalSize) {
      return {
        valid: false,
        error: customErrorMessage || `附件总大小超过限制。当前: ${formatFileSize(currentTotalSize + file.size)}，最大允许: ${formatFileSize(maxTotalSize)}`,
      };
    }

    return { valid: true };
  };

  const beforeUpload = (
    file: File,
    currentFileList: { size?: number }[] = []
  ): boolean => {
    const currentTotalSize = currentFileList.reduce((sum, f) => sum + (f.size || 0), 0);
    const result = validateFile(file, currentTotalSize);

    if (!result.valid && showErrorMessage && result.error) {
      message.error(result.error);
    }

    return result.valid;
  };

  return {
    getFileExtension,
    isImageFile,
    formatFileSize,
    validateFile,
    beforeUpload,
  };
};
