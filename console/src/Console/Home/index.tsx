import ConsoleLayout from '../Layout/ConsoleLayout';
import Typography from 'antd/es/typography/Typography';
import { Col, Flex } from 'antd';
import { useEffect } from 'react';
import api from '../../api';

export default function Home() {
  const getCoins = async () => {
    try {
      const response = await api.get('/coins');
      console.log('Coins data:', response);
    } catch (error) {
      console.error('Error fetching coins:', error);
    }
  };

  useEffect(() => {
    getCoins();
  }, []);

  return (
    <ConsoleLayout
      content={
        <Flex align="center" justify="center" style={{ width: '100%' }}>
          <Typography>HOME</Typography>
        </Flex>
      }></ConsoleLayout>
  );
}
