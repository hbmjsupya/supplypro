import request from '../utils/request';

export interface FileUploadResponse {
  fileName: string;
  fileUrl: string;
}

export const uploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<any, FileUploadResponse>('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
