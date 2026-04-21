const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Settlement/PendingSettlementList.tsx', 'utf8');

// Replace handleInitiateSettlement
content = content.replace(
  /const handleInitiateSettlement = async \(\) => \{[\s\S]*?if \(groups\.size === 1\) \{/m,
  `const handleInitiateSettlement = async () => {
      if (selectedRowKeys.length === 0) {
          message.warning('请选择要结算的记录');
          return;
      }

      const selectedItems = data.filter(item => selectedRowKeys.includes(item.id));
      
      // Group by Supplier
      const groups = new Map<string, PendingSettlementType[]>();
      selectedItems.forEach(item => {
          const key = String(item.supplierId);
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)?.push(item);
      });

      if (groups.size === 1) {`
);

// Replace handleBatchConfirm
content = content.replace(
  /const handleBatchConfirm = async \(\) => \{[\s\S]*?finally \{/m,
  `const handleBatchConfirm = async () => {
      if (!batchConfirmData) return;

      try {
          setLoading(true);
          
          const allPurchaseOrderIds = [];
          for (const [supplierId, items] of batchConfirmData.groups.entries()) {
              items.forEach((item: any) => {
                  if (item.purchaseOrderId) {
                      allPurchaseOrderIds.push(item.purchaseOrderId);
                  }
              });
          }
          
          if (allPurchaseOrderIds.length > 0) {
              await createPurchaseSettlementsFromPending(allPurchaseOrderIds, 'admin');
              message.success(\`成功生成 \${batchConfirmData.groups.size} 个结算单\`);
              loadData();
              setSelectedRowKeys([]);
          }
      } catch (error) {
          message.error('批量生成结算单失败');
      } finally {`
);

// Replace handleConfirmSettlement
content = content.replace(
  /const handleConfirmSettlement = async \(\) => \{[\s\S]*?\} catch \(error\) \{/m,
  `const handleConfirmSettlement = async () => {
      const { items } = bankModalData;
      
      try {
          const pendingPurchaseOrderIds = items.map((i: any) => i.purchaseOrderId).filter(Boolean);
          if (pendingPurchaseOrderIds.length > 0) {
              await createPurchaseSettlementsFromPending(pendingPurchaseOrderIds, 'admin');
              message.success('结算发起成功');
              setBankModalVisible(false);
              setSelectedRowKeys([]);
              loadData();
          } else {
              message.error('未找到有效的采购单数据');
          }
      } catch (error) {`
);

// Replace columns
content = content.replace(
  /const columns: ColumnsType<PendingSettlementType> = \[[\s\S]*?return \(/m,
  `const getBizTypeInfo = (bizType: string) => {
    switch (bizType) {
      case 'PLATFORM':
      case 'OrderPurchase':
        return { label: '订单采购', icon: <ShoppingCartOutlined />, color: '#1890ff', bg: '#e6f7ff' };
      case 'REPLENISHMENT':
      case 'ReplenishPurchase':
        return { label: '补货采购', icon: <SyncOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      case 'INBOUND':
      case 'ProductInbound':
        return { label: '入库采购', icon: <SyncOutlined />, color: '#722ed1', bg: '#f9f0ff' };
      case 'COST_ADJUSTMENT':
        return { label: '调价单', icon: <DollarOutlined />, color: '#52c41a', bg: '#f6ffed' };
      default:
        return { label: bizType || '-', icon: <DollarOutlined />, color: '#8c8c8c', bg: '#f5f5f5' };
    }
  };

  const getSettlementPeriodInfo = (period: number) => {
    switch (period) {
      case 1: return '日结';
      case 7: return '周结';
      case 30: return '月结';
      case 90: return '季结';
      default: return period ? \`\${period}天\` : '-';
    }
  };

  const columns: ColumnsType<PendingSettlementType> = [
    {
      title: '业务类型/单号',
      key: 'bizInfo',
      width: 140,
      render: (_, record) => {
        const info = getBizTypeInfo(record.bizType);
        return (
          <Space direction="vertical" size={0}>
            <Tag icon={info.icon} color={info.bg} style={{ color: info.color, borderColor: info.color }}>
              {info.label}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.bizNo || '-'}
            </Typography.Text>
          </Space>
        );
      }
    },
    {
      title: '采购单号',
      dataIndex: 'purchaseOrderNo',
      key: 'purchaseOrderNo',
      width: 160,
      render: (text) => <Typography.Text strong style={{ color: '#1890ff' }}>{text || '-'}</Typography.Text>
    },
    {
      title: '商品供应商',
      dataIndex: 'supplierName',
      key: 'supplierName',
      width: 120,
    },
    {
      title: '结算类型',
      dataIndex: 'settlementType',
      key: 'settlementType',
      width: 100,
      render: (type) => {
        const text = type === 'CASH' ? '现付' : type === 'PREPAYMENT' ? '预付' : type || '-';
        const color = type === 'CASH' ? 'green' : type === 'PREPAYMENT' ? 'blue' : 'default';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '结算周期',
      dataIndex: 'settlementPeriod',
      key: 'settlementPeriod',
      width: 100,
      render: (period) => getSettlementPeriodInfo(period)
    },
    {
      title: '商品费用',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (v) => <Typography.Text strong style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>¥{v?.toFixed(2)}</Typography.Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
            {
                key: 'view',
                label: '查看详情',
                onClick: () => {
                    navigate(\`/supply-chain/purchase-order/detail/\${record.purchaseOrderId}\`);
                }
            },
            {
                key: 'settle',
                label: '发起结算',
                onClick: () => {
                    setSelectedRowKeys([record.id]);
                    handleInitiateSingleSettlement([record]);
                }
            }
        ];
        return (
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                <Button type="link" onClick={e => e.preventDefault()}>
                    操作 <DownOutlined />
                </Button>
            </Dropdown>
        );
      },
    },
  ];

  return (`
);

fs.writeFileSync('frontend/src/pages/Settlement/PendingSettlementList.tsx', content);
