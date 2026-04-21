import React, { useState, useEffect } from 'react';
import { Upload, message, Image, Progress, Button } from 'antd';
import { PlusOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import axios from 'axios';
import { useFileUpload } from '../utils/hooks/useFileUpload';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  maxSize?: number;
  accept?: string;
  uploadUrl?: string;
  placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  maxSize = 5,
  accept = 'image/png,image/jpeg,image/svg+xml,image/gif,image/webp',
  uploadUrl = '/api/brands/upload-icon',
  placeholder = '点击或拖拽上传图片'
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(value);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { beforeUpload } = useFileUpload({
    allowedMimeTypes: accept.split(','),
    maxSize: maxSize * 1024 * 1024,
    customErrorMessage: `只能上传 ${accept.replace(/image\//g, '').replace(/,/g, ', ')} 格式的图片`,
  });

  useEffect(() => {
    if (value !== undefined) {
      setImageUrl(value);
    }
  }, [value]);

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as File);

    setLoading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      if (response.data.code === 200) {
        const url = response.data.data.fileUrl;
        setImageUrl(url);
        onChange?.(url);
        message.success('图片上传成功');
        onSuccess?.(response.data);
      } else {
        message.error(response.data.message || '上传失败');
        onError?.(new Error(response.data.message));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '上传失败';
      message.error(errorMessage);
      onError?.(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    setImageUrl(undefined);
    onChange?.('');
  };

  const uploadButton = (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <>
          <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          {uploadProgress > 0 && (
            <Progress 
              percent={uploadProgress} 
              size="small" 
              style={{ width: 80, marginTop: 8 }}
              showInfo={false}
            />
          )}
        </>
      ) : (
        <>
          <PlusOutlined style={{ fontSize: 24, color: '#999' }} />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>{placeholder}</div>
          <div style={{ color: '#ccc', fontSize: 10, marginTop: 4 }}>
            支持 PNG, JPG, SVG, GIF, WEBP
          </div>
          <div style={{ color: '#ccc', fontSize: 10 }}>
            最大 {maxSize}MB
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <Upload
        name="file"
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        accept={accept}
        style={{ width: 120, height: 120 }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="brand icon"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            preview={false}
          />
        ) : (
          uploadButton
        )}
      </Upload>
      {imageUrl && (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={handleRemove}
          style={{ marginTop: 8 }}
        >
          删除图片
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;
