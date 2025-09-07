import React from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';

interface TableDataPoint {
  key: string;
  coin?: string;
  currency?: string;
  date: string;
  price: number;
  [key: string]: any;
}

interface PriceTableProps {
  tableData: TableDataPoint[];
  breakdownDimensions: string[];
}

const PriceTable: React.FC<PriceTableProps> = ({ tableData, breakdownDimensions }) => {
  const getTableColumns = (): ColumnsType<any> => {
    const columns: ColumnsType<any> = [
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
    ];

    // Only show columns for selected breakdown dimensions
    if (breakdownDimensions.includes('coin')) {
      columns.push({
        title: 'Coin',
        dataIndex: 'coin',
        key: 'coin',
        sorter: (a: any, b: any) => (a.coin || '').localeCompare(b.coin || ''),
      });
    }

    if (breakdownDimensions.includes('currency')) {
      columns.push({
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        sorter: (a: any, b: any) => (a.currency || '').localeCompare(b.currency || ''),
      });
    }

    columns.push({
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a: any, b: any) => (a.price || 0) - (b.price || 0),
      render: (value: number) => {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        return value.toLocaleString();
      },
    });

    return columns;
  };

  return (
    <Card title="Price Data Table">
      <Table
        columns={getTableColumns()}
        dataSource={tableData}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default PriceTable;
