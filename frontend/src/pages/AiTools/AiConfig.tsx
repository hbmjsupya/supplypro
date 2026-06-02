import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Tag, Popconfirm, Descriptions, Select, Radio, AutoComplete } from 'antd';
import { SaveOutlined, DeleteOutlined, KeyOutlined, EyeOutlined, EyeInvisibleOutlined, StarOutlined, BulbOutlined, UserOutlined } from '@ant-design/icons';
import { getCurrentUser } from '../../services/authService';

const STORAGE_KEY = 'supplypro_ai_configs';

interface AiConfig {
    provider: string;
    providerKey: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    isPrimary: boolean;
    scenario: string;
    createdBy: string;
    createdAt: string;
}

const DOMESTIC_PROVIDERS = [
    {
        key: 'tongyi',
        name: '通义千问',
        company: '阿里云',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'],
        icon: '🌥️',
    },
    {
        key: 'ernie',
        name: '文心一言',
        company: '百度',
        baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
        models: ['completions_pro', 'eb-instant', 'ernie-4.0-turbo', 'ernie-3.5-turbo'],
        icon: '🌀',
    },
    {
        key: 'glm',
        name: '智谱AI',
        company: '智谱华章',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: ['glm-4', 'glm-4v', 'glm-3-turbo'],
        icon: '💎',
    },
    {
        key: 'deepseek',
        name: 'DeepSeek',
        company: '深度求索',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner'],
        icon: '🌊',
    },
    {
        key: 'doubao',
        name: '豆包',
        company: '字节跳动',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: ['Doubao-3', 'Doubao-3-Plus'],
        icon: '🥟',
    },
    {
        key: 'xinghuo',
        name: '讯飞星火',
        company: '科大讯飞',
        baseUrl: 'https://spark-api.xf-yun.com/v1.1/chat',
        models: ['general', 'generalv2', 'generalv3'],
        icon: '✨',
    },
];

const SCENARIOS = [
    { value: 'global', label: '全局总控' },
    { value: 'category-mapping', label: '分类映射' },
    { value: 'content-generation', label: '内容生成' },
    { value: 'data-analysis', label: '数据分析' },
    { value: 'customer-service', label: '客服助手' },
    { value: 'other', label: '其他' },
];

const getProviderByKey = (key: string) => DOMESTIC_PROVIDERS.find(p => p.key === key);

const AiConfigPage: React.FC = () => {
    const [form] = Form.useForm();
    const [configs, setConfigs] = useState<AiConfig[]>([]);
    const [showKeys, setShowKeys] = useState<Set<number>>(new Set());
    const [modelOptions, setModelOptions] = useState<{ value: string }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as AiConfig[];
                const filtered = parsed.filter(cfg => {
                    if (!cfg.providerKey) return false;
                    if (cfg.providerKey === 'admin' || cfg.provider === 'admin') return false;
                    return DOMESTIC_PROVIDERS.some(p => p.key === cfg.providerKey);
                });
                const normalized = filtered.map(cfg => ({
                    ...cfg,
                    isPrimary: cfg.isPrimary ?? false,
                    scenario: cfg.scenario ?? '',
                    model: cfg.model ?? '',
                    createdBy: cfg.createdBy ?? '',
                }));
                if (normalized.length > 0 && !normalized.some(c => c.isPrimary)) {
                    normalized[0].isPrimary = true;
                }
                setConfigs(normalized);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        form.resetFields();
    }, []);

    const saveConfigs = (newConfigs: AiConfig[]) => {
        const hasPrimary = newConfigs.some(c => c.isPrimary);
        const withPrimary = newConfigs.map((cfg, idx) => ({
            ...cfg,
            isPrimary: hasPrimary ? cfg.isPrimary : idx === 0,
        }));
        setConfigs(withPrimary);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withPrimary));
    };

    const handleProviderChange = (providerKey: string) => {
        const provider = getProviderByKey(providerKey);
        if (provider) {
            setModelOptions(provider.models.map((m: string) => ({ value: m })));
            form.setFieldsValue({
                apiKey: '',
                baseUrl: provider.baseUrl,
                model: undefined,
            });
        }
    };

    const handleAdd = () => {
        form.validateFields().then((values) => {
            const provider = getProviderByKey(values.provider);
            const currentUser = getCurrentUser();
            const isPrimary = values.isPrimary ?? false;
            const newConfig: AiConfig = {
                provider: provider?.name || values.provider,
                providerKey: values.provider,
                apiKey: values.apiKey.trim(),
                baseUrl: values.baseUrl.trim(),
                model: values.model.trim(),
                isPrimary,
                scenario: values.scenario || '',
                createdBy: currentUser?.username || '',
                createdAt: new Date().toISOString(),
            };
            let newConfigs: AiConfig[];
            if (isPrimary) {
                newConfigs = [
                    ...configs.map(c => ({ ...c, isPrimary: false })),
                    newConfig,
                ];
            } else {
                newConfigs = [...configs, newConfig];
            }
            saveConfigs(newConfigs);
            form.resetFields();
            message.success('AI配置已保存');
        });
    };

    const handleDelete = (index: number) => {
        const newConfigs = configs.filter((_, i) => i !== index);
        if (newConfigs.length > 0 && configs[index].isPrimary) {
            newConfigs[0].isPrimary = true;
        }
        saveConfigs(newConfigs);
        message.success('已删除');
    };

    const handleSetPrimary = (index: number) => {
        const newConfigs = configs.map((cfg, i) => ({
            ...cfg,
            isPrimary: i === index,
        }));
        saveConfigs(newConfigs);
        message.success('已设为主模型');
    };

    const toggleKey = (index: number) => {
        const next = new Set(showKeys);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setShowKeys(next);
    };

    const maskKey = (key: string) => {
        if (!key) return '';
        if (key.length <= 8) return key.substring(0, 4) + '****';
        return key.substring(0, 4) + '****' + key.substring(key.length - 4);
    };

    return (
        <div>
            <Card title="AI Key 配置" style={{ marginBottom: 24 }}>
                <Form form={form} layout="vertical" initialValues={{ apiKey: '', provider: undefined, baseUrl: '', model: '', scenario: undefined, isPrimary: false }} autoComplete="off">
                    <Form.Item
                        name="provider"
                        label="AI 供应商"
                        rules={[{ required: true, message: '请选择AI供应商' }]}
                    >
                        <Select
                            placeholder="请选择AI供应商"
                            onChange={handleProviderChange}
                            virtual={false}
                            showSearch={false}
                            optionLabelProp="label"
                        >
                            {DOMESTIC_PROVIDERS.map((provider) => (
                                <Select.Option
                                    key={provider.key}
                                    value={provider.key}
                                    label={`${provider.icon} ${provider.name}`}
                                >
                                    {provider.icon} {provider.name}（{provider.company}）
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="apiKey"
                        label="API Key"
                        rules={[{ required: true, message: '请输入API Key' }]}
                    >
                        <Input.Password placeholder="请输入API Key" autoComplete="new-password" />
                    </Form.Item>

                    <Form.Item
                        name="baseUrl"
                        label="API Base URL"
                        rules={[{ required: true, message: '请输入API地址' }]}
                    >
                        <Input placeholder="https://api.example.com/v1" />
                    </Form.Item>

                    <Form.Item
                        name="model"
                        label="模型名称"
                        rules={[{ required: true, message: '请输入或选择模型名称' }]}
                    >
                        <AutoComplete
                            placeholder="请输入或选择模型名称"
                            options={modelOptions}
                            filterOption={(inputValue, option) =>
                                option!.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="scenario"
                        label="应用场景"
                        rules={[{ required: true, message: '请选择应用场景' }]}
                    >
                        <Select placeholder="请选择应用场景">
                            {SCENARIOS.map((scenario) => (
                                <Select.Option key={scenario.value} value={scenario.value}>
                                    {scenario.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="isPrimary"
                        label="设为主模型"
                        initialValue={false}
                    >
                        <Radio.Group>
                            <Radio value={true}>是（优先使用此配置）</Radio>
                            <Radio value={false}>否</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleAdd}>
                            保存配置
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {configs.length > 0 && (
                <Card title={`已配置的 AI Key (${configs.length})`}>
                    {configs.map((cfg, index) => {
                        const provider = getProviderByKey(cfg.providerKey);
                        const scenario = SCENARIOS.find(s => s.value === cfg.scenario);
                        return (
                            <Card
                                key={index}
                                size="small"
                                style={{ marginBottom: 12 }}
                                type="inner"
                                title={
                                    <Space>
                                        <KeyOutlined style={{ color: '#1677ff' }} />
                                        <span>
                                            {provider?.icon} {cfg.provider}
                                        </span>
                                        <Tag color="blue">{cfg.model}</Tag>
                                        {cfg.isPrimary && (
                                            <Tag color="gold"><StarOutlined /> 主模型</Tag>
                                        )}
                                        <Tag color="cyan"><BulbOutlined /> {scenario?.label || '未设置'}</Tag>
                                    </Space>
                                }
                                extra={
                                    <Space>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={showKeys.has(index) ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                            onClick={() => toggleKey(index)}
                                        >
                                            {showKeys.has(index) ? '隐藏' : '显示'}
                                        </Button>
                                        {!cfg.isPrimary && (
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<StarOutlined />}
                                                onClick={() => handleSetPrimary(index)}
                                            >
                                                设为主模型
                                            </Button>
                                        )}
                                        <Popconfirm
                                            title="确定要删除此配置吗？"
                                            onConfirm={() => handleDelete(index)}
                                        >
                                            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                                                删除
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                }
                            >
                                <Descriptions column={2} size="small">
                                    <Descriptions.Item label="API Key">
                                        {showKeys.has(index) ? cfg.apiKey : maskKey(cfg.apiKey)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="模型名称">
                                        <Tag color="blue">{cfg.model || '-'}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Base URL">{cfg.baseUrl}</Descriptions.Item>
                                    <Descriptions.Item label="所属公司">
                                        {provider?.company || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="应用场景">
                                        {scenario?.label || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="是否主模型">
                                        {cfg.isPrimary ? '是' : '否'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="创建人">
                                        <Space size={4}>
                                            <UserOutlined />
                                            <span>{cfg.createdBy || '-'}</span>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="创建时间">
                                        {new Date(cfg.createdAt).toLocaleString('zh-CN')}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        );
                    })}
                </Card>
            )}
        </div>
    );
};

export default AiConfigPage;
