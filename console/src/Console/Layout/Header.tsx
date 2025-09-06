import { Button, Col, Flex, Image, Layout, Row, Tooltip, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PiSignOutBold } from 'react-icons/pi';

const { Header } = Layout;

const LayoutHeader = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      navigate('/auth/login');
    }
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');

    navigate('/auth/login');
  };

  return (
    <Header style={{ padding: 0, height: 100 }}>
      <Row style={{ paddingTop: 12 }}>
        <Col span={8} offset={8}>
          <Flex justify="center" align="center">
            <Typography.Title level={4}>HYPERMONK CASE STUDY DASHBOARD</Typography.Title>
          </Flex>
        </Col>
        <Col offset={7}>
          <Tooltip title="Sign Out">
            <Button onClick={handleSignOut} type="text" icon={<PiSignOutBold size={24} />}></Button>
          </Tooltip>
        </Col>
      </Row>
    </Header>
  );
};

export default LayoutHeader;
