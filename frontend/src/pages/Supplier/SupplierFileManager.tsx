import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Button, message, Modal, Space, Popconfirm, Form, Input, Table, Tag, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, FileOutlined, EyeOutlined, DownloadOutlined, EditOutlined, HistoryOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import request from '../../utils/request';

export interface SupplierFileDTO {
    id: number | string;
    originalFileName: string;
    storedFileName: string;
    fileType: string;
    fileSize: number;
    uploadTime: string;
    uploader?: string;
    description: string;
    url: string;
    version: number;
    groupId: string;
    isLatest: boolean;
    category: string;
}

interface SupplierFileManagerProps {
    supplierId?: number;
    category: 'QUALIFICATION' | 'CONTRACT';
    isView: boolean;
    onFilesChange?: (files: SupplierFileDTO[]) => void;
    apiPrefix?: string;
}

const addTokenToUrl = (url: string) => {
    const token = localStorage.getItem('token');
    if (!token) return url;
    return `${url}${url.includes('?') ? '&' : '?'}token=${token}`;
};

const SupplierFileManager: React.FC<SupplierFileManagerProps> = ({ supplierId, category, isView, onFilesChange, apiPrefix = '/supplier-files' }) => {
    const [fileList, setFileList] = useState<SupplierFileDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<SupplierFileDTO | null>(null);
    const [editForm] = Form.useForm();

    // Version Control States
    const [updateVersionOpen, setUpdateVersionOpen] = useState(false);
    const [updatingFile, setUpdatingFile] = useState<SupplierFileDTO | null>(null);
    
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState<SupplierFileDTO[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchFiles = useCallback(async () => {
        if (!supplierId) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await request.get(`${apiPrefix}/${supplierId}`, {
                params: { category }
            });
            const filesWithToken = (res || []).map((file: SupplierFileDTO) => ({
                ...file,
                url: addTokenToUrl(file.url)
            }));
            setFileList(filesWithToken);
            onFilesChange?.(filesWithToken);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Failed to fetch files:', error);
            if (error.response) {
                const { status } = error.response;
                if (status === 404) {
                    message.error('文件服务不可用(404)：请管理员检查部署或重新创建默认目录');
                } else if (status === 401) {
                    message.error('认证失败(401)：请重新登录');
                } else if (status === 500) {
                    message.error('服务器内部错误(500)：请联系管理员');
                } else {
                    message.error(`获取文件列表失败: ${status}`);
                }
            } else {
                message.error('网络错误或服务不可达');
            }
        }
    }, [supplierId, category, apiPrefix, onFilesChange]);

    useEffect(() => {
        if (supplierId) {
            fetchFiles();
        } else {
            setFileList([]); // Reset for new supplier
            onFilesChange?.([]);
        }
    }, [supplierId, category, fetchFiles, onFilesChange]);

    const beforeUpload = (file: UploadFile) => {
        const isLt50M = (file.size || 0) / 1024 / 1024 < 50;
        if (!isLt50M) {
            message.error('文件大小不能超过 50MB!');
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const handleUpload: UploadProps['customRequest'] = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('file', file as File);
        formData.append('category', category);

        try {
            setLoading(true);
            let newFile: SupplierFileDTO;

            if (supplierId) {
                // Permanent upload
                await request.post(`${apiPrefix}/${supplierId}/upload`, formData);
                message.success('上传成功');
                fetchFiles(); // Reload list
                onSuccess?.("ok");
            } else {
                // Temp upload
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const res: any = await request.post(`${apiPrefix}/temp/upload`, formData);
                console.log('Temp file uploaded:', res);
                newFile = {
                    ...res,
                    url: addTokenToUrl(res.url)
                };
                message.success('上传成功');
                const newList = [...fileList, newFile];
                setFileList(newList);
                onFilesChange?.(newList);
                onSuccess?.("ok");
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Upload error details:', error);
            const errorMsg = error.response?.data?.message || error.message || '上传失败';
            
            if (error.response) {
                const { status } = error.response;
                if (status === 404) {
                     message.error('上传失败(404)：请管理员检查上传服务或默认目录是否创建');
                } else if (status === 401) {
                     message.error('上传失败(401)：会话已过期，请重新登录');
                } else if (status === 413) {
                     message.error('上传失败(413)：文件大小超过限制(50MB)');
                } else if (status === 500) {
                     message.error('上传失败(500)：服务器内部错误');
                } else {
                     message.error(`上传失败: ${errorMsg}`);
                }
            } else {
                message.error(`上传失败: ${errorMsg}`);
            }
            onError?.(error as Error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (file: SupplierFileDTO) => {
        try {
            if (supplierId && file.id) {
                // Permanent delete
                await request.delete(`${apiPrefix}/${file.id}`);
                message.success('删除成功');
                fetchFiles();
            } else {
                // Temp delete (remove from local list)
                // Use storedFileName as unique identifier for temp files if id is missing
                const newList = fileList.filter(f => f.storedFileName !== file.storedFileName);
                setFileList(newList);
                onFilesChange?.(newList);
                message.success('删除成功');
            }
        } catch {
            message.error('删除失败');
        }
    };

    const isImage = (fileName: string) => {
        return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
    };

    const handlePreview = (file: SupplierFileDTO) => {
        if (isImage(file.originalFileName)) {
            setPreviewImage(file.url);
            setPreviewTitle(file.originalFileName);
            setPreviewOpen(true);
        } else {
            window.open(file.url, '_blank');
        }
    };

    const handleEdit = (file: SupplierFileDTO) => {
        setEditingFile(file);
        editForm.setFieldsValue({ description: file.description });
        setEditOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            if (editingFile) {
                if (supplierId && editingFile.id) {
                    await request.put(`${apiPrefix}/${editingFile.id}`, null, {
                        params: { description: values.description }
                    });
                    message.success('更新成功');
                    fetchFiles();
                } else {
                    // Update local temp file
                    const newList = fileList.map(f => {
                        if (f.storedFileName === editingFile.storedFileName) {
                            return { ...f, description: values.description };
                        }
                        return f;
                    });
                    setFileList(newList);
                    onFilesChange?.(newList);
                    message.success('更新成功');
                }
                setEditOpen(false);
            }
        } catch (error) {
            console.error(error);
            message.error('更新失败');
        }
    };

    // Version Control Handlers
    const handleOpenUpdateVersion = (file: SupplierFileDTO) => {
        setUpdatingFile(file);
        setUpdateVersionOpen(true);
    };

    const handleUpdateVersion: UploadProps['customRequest'] = async (options) => {
        if (!updatingFile) return;
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('file', file as File);
        // formData.append('description', 'Updated version'); // Could add description field

        try {
            setLoading(true);
            await request.post(`${apiPrefix}/${updatingFile.id}/version`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('版本更新成功');
            setUpdateVersionOpen(false);
            fetchFiles();
            onSuccess?.("ok");
        } catch (error) {
            message.error('版本更新失败');
            onError?.(error as Error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewHistory = async (file: SupplierFileDTO) => {
        try {
            setHistoryLoading(true);
            setHistoryOpen(true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await request.get(`${apiPrefix}/history/${file.groupId}`);
            const filesWithToken = (res || []).map((file: SupplierFileDTO) => ({
                ...file,
                url: addTokenToUrl(file.url)
            }));
            setHistoryList(filesWithToken);
        } catch {
            message.error('获取历史版本失败');
        } finally {
            setHistoryLoading(false);
        }
    };

    const historyColumns = [
        { title: '版本', dataIndex: 'version', key: 'version', render: (v: number) => `V${v}` },
        { title: '文件名', dataIndex: 'originalFileName', key: 'originalFileName' },
        { title: '上传时间', dataIndex: 'uploadTime', key: 'uploadTime', render: (t: string) => new Date(t).toLocaleString() },
        { title: '上传者', dataIndex: 'uploader', key: 'uploader' },
        { 
            title: '操作', 
            key: 'action',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_: any, record: SupplierFileDTO) => (
                <Space>
                    <Button type="link" size="small" onClick={() => handlePreview(record)}>预览</Button>
                    <Button type="link" size="small" href={record.url} target="_blank">下载</Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            {!isView && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Upload
                        customRequest={handleUpload}
                        showUploadList={false}
                        accept={category === 'QUALIFICATION' ? ".jpg,.jpeg,.png,.pdf" : ".pdf,.doc,.docx,.xls,.xlsx"}
                    >
                        <Button icon={<UploadOutlined />} loading={loading}>
                            上传文件
                        </Button>
                    </Upload>
                </div>
            )}

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                {fileList.map((item, index) => (
                    <Col xs={24} sm={12} md={6} lg={6} xl={6} xxl={6} key={item.id || item.storedFileName || index}>
                        <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, textAlign: 'center', position: 'relative' }}>
                            <Tag color="blue" style={{ position: 'absolute', top: 5, right: 5 }}>V{item.version}</Tag>
                            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, cursor: 'pointer' }} onClick={() => handlePreview(item)}>
                                {isImage(item.originalFileName) ? (
                                    <img src={item.url} alt={item.originalFileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <FileOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                                )}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }} title={item.originalFileName}>
                                {item.originalFileName}
                            </div>
                            <Space wrap style={{ justifyContent: 'center' }}>
                                <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handlePreview(item)} title="预览" />
                                <Button type="text" icon={<DownloadOutlined />} size="small" href={item.url} target="_blank" title="下载" />
                                <Button type="text" icon={<HistoryOutlined />} size="small" onClick={() => handleViewHistory(item)} title="历史版本" />
                                {!isView && (
                                    <>
                                        {supplierId && (
                                            <Button type="text" icon={<CloudUploadOutlined />} size="small" onClick={() => handleOpenUpdateVersion(item)} title="更新版本" />
                                        )}
                                        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleEdit(item)} title="编辑信息" />
                                        <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(item)}>
                                            <Button type="text" danger icon={<DeleteOutlined />} size="small" title="删除" />
                                        </Popconfirm>
                                    </>
                                )}
                            </Space>
                        </div>
                        <div style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 }}>
                           {item.description || '-'}
                        </div>
                    </Col>
                ))}
            </Row>
            
            <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={() => setPreviewOpen(false)}
                width={800}
            >
                <img alt="example" style={{ width: '100%' }} src={previewImage} />
            </Modal>

            <Modal
                open={editOpen}
                title="编辑文件信息"
                onOk={handleSaveEdit}
                onCancel={() => setEditOpen(false)}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item name="description" label="文件描述">
                        <Input.TextArea rows={4} maxLength={200} showCount />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={updateVersionOpen}
                title={`更新版本: ${updatingFile?.originalFileName}`}
                footer={null}
                onCancel={() => setUpdateVersionOpen(false)}
            >
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <p>上传新文件将作为 V{(updatingFile?.version || 0) + 1} 版本保存，旧版本将保留在历史记录中。</p>
                    <Upload
                        beforeUpload={beforeUpload}
                        customRequest={handleUpdateVersion}
                        showUploadList={false}
                        accept={category === 'QUALIFICATION' ? ".jpg,.jpeg,.png,.pdf" : ".pdf,.doc,.docx,.xls,.xlsx"}
                    >
                        <Button type="primary" icon={<CloudUploadOutlined />} loading={loading}>
                            选择并上传新版本
                        </Button>
                    </Upload>
                </div>
            </Modal>

            <Modal
                open={historyOpen}
                title="文件历史版本"
                footer={null}
                onCancel={() => setHistoryOpen(false)}
                width={700}
            >
                <Table 
                    dataSource={historyList} 
                    columns={historyColumns} 
                    rowKey="id" 
                    loading={historyLoading}
                    pagination={{ pageSize: 5 }}
                />
            </Modal>
        </div>
    );
};

export default SupplierFileManager;
