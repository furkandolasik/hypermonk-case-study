import React from 'react';
import { Row, Col, Card, Select, DatePicker, Checkbox } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface DashboardFilters {
  coins: string[];
  currencies: string[];
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  breakdownDimensions: string[];
}

interface Coin {
  id: string;
  name: string;
}

interface Currency {
  code: string;
  name: string;
}

interface PriceFiltersProps {
  filters: DashboardFilters;
  availableCoins: Coin[];
  availableCurrencies: Currency[];
  onFilterChange: (filterType: keyof DashboardFilters, value: any) => void;
}

const PriceFilters: React.FC<PriceFiltersProps> = ({
  filters,
  availableCoins,
  availableCurrencies,
  onFilterChange,
}) => {
  return (
    <Card style={{ marginBottom: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <label>Coins:</label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select coins"
            value={filters.coins}
            onChange={(value) => onFilterChange('coins', value)}
            options={availableCoins.map((coin) => ({
              label: coin.name,
              value: coin.id,
            }))}
          />
        </Col>

        <Col span={6}>
          <label>Currencies:</label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Select currencies"
            value={filters.currencies}
            onChange={(value) => onFilterChange('currencies', value)}
            options={availableCurrencies.map((currency) => ({
              label: currency.name,
              value: currency.code,
            }))}
          />
        </Col>

        <Col span={6}>
          <label>Date Range:</label>
          <RangePicker
            style={{ width: '100%' }}
            value={filters.dateRange}
            onChange={(dates) => onFilterChange('dateRange', dates)}
          />
        </Col>

        <Col span={6}>
          <label>Breakdown Dimensions:</label>
          <Checkbox.Group
            style={{ width: '100%' }}
            value={filters.breakdownDimensions}
            onChange={(values) => onFilterChange('breakdownDimensions', values)}>
            <div>
              <Checkbox value="coin">Coin</Checkbox>
              <Checkbox value="currency">Currency</Checkbox>
              <Checkbox value="date">Date</Checkbox>
            </div>
          </Checkbox.Group>
        </Col>
      </Row>
    </Card>
  );
};

export default PriceFilters;
