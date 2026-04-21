import { useState } from 'react';
import { message } from 'antd';
import * as XLSX from 'xlsx';

interface ExportColumn {
  title: string;
  dataIndex: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, record: any) => string;
}

interface UseExportOptions<T> {
  filenamePrefix: string;
  fetchData: () => Promise<T[]> | T[];
  columns: ExportColumn[];
  batchSize?: number;
}

export const useExport = <T extends Record<string, unknown>>({
  filenamePrefix,
  fetchData,

  columns,
  batchSize = 100
}: UseExportOptions<T>) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    message.loading({ content: '正在准备导出...', key: 'export_loading' });

    try {
      // 1. Fetch Data
      const data = await fetchData();
      const total = data.length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedData: any[] = [];

      for (let i = 0; i < total; i += batchSize) {
        // Simulate async processing/network to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const chunk = data.slice(i, Math.min(i + batchSize, total));
        
        const processedChunk = chunk.map(item => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row: Record<string, any> = {};
          columns.forEach(col => {
            const val = item[col.dataIndex];
            row[col.title] = col.render ? col.render(val, item) : val;
          });
          return row;
        });
        
        processedData.push(...processedChunk);
        
        const currentProgress = Math.round(((i + chunk.length) / total) * 100);
        setProgress(currentProgress);
      }

      // 2. Generate Excel
      const header = columns.map(col => col.title);
      const worksheet = XLSX.utils.json_to_sheet(processedData, { header });
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // 3. Download
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${filenamePrefix}_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);

      message.success({ content: `导出成功: ${filename}`, key: 'export_loading' });
    } catch (error) {
      console.error('Export failed:', error);
      message.error({ content: '导出失败，请重试', key: 'export_loading' });
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return {
    exporting,
    progress,
    handleExport
  };
};
