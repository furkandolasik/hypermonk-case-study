import React, { useState, useEffect } from 'react';
import { Card, Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MenuOutlined } from '@ant-design/icons';

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

const DraggableHeaderCell = ({ children, id, ...restProps }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  };

  return (
    <th {...restProps} ref={setNodeRef} style={{ ...restProps.style, ...style }} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <MenuOutlined style={{ marginRight: '8px', color: '#999' }} />
        {children}
      </div>
    </th>
  );
};

const PriceTable: React.FC<PriceTableProps> = ({ tableData, breakdownDimensions }) => {
  const [columns, setColumns] = useState<ColumnsType<any>>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setColumns(getInitialColumns());
  }, [breakdownDimensions]);

  const getInitialColumns = (): ColumnsType<any> => {
    const initialColumns: ColumnsType<any> = [
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      },
    ];

    if (breakdownDimensions.includes('coin')) {
      initialColumns.push({
        title: 'Coin',
        dataIndex: 'coin',
        key: 'coin',
        sorter: (a: any, b: any) => (a.coin || '').localeCompare(b.coin || ''),
      });
    }

    if (breakdownDimensions.includes('currency')) {
      initialColumns.push({
        title: 'Currency',
        dataIndex: 'currency',
        key: 'currency',
        sorter: (a: any, b: any) => (a.currency || '').localeCompare(b.currency || ''),
      });
    }

    initialColumns.push({
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a: any, b: any) => (a.price || 0) - (b.price || 0),
      render: (value: number) => {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        return value.toLocaleString();
      },
    });

    return initialColumns;
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.key === active.id);
      const newIndex = columns.findIndex((col) => col.key === over.id);

      setColumns(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const columnsWithDrag = columns.map((col) => ({
    ...col,
    onHeaderCell: () =>
      ({
        id: String(col.key),
      }) as any,
  }));

  return (
    <Card>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((col) => String(col.key))} strategy={horizontalListSortingStrategy}>
          <Table
            columns={columnsWithDrag}
            dataSource={tableData}
            scroll={{ x: 800 }}
            components={{
              header: {
                cell: DraggableHeaderCell,
              },
            }}
          />
        </SortableContext>
      </DndContext>
    </Card>
  );
};

export default PriceTable;
