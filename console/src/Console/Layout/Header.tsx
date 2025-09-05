import { Col, Flex, Image, Layout, Row } from 'antd';
import { useNavigate } from 'react-router-dom';
import iconImg from './logo.jpg';

const { Header } = Layout;

const LayoutHeader = () => {
  const navigate = useNavigate();

  return (
    <Header style={{ padding: 0, height: 100 }}>
      <Row style={{ paddingTop: 12 }}>
        <Col span={8} offset={8}>
          <Flex justify="center" align="center">
            <Image
              onClick={() => navigate('/home')}
              preview={false}
              src={iconImg}
              alt="logo"
              style={{ width: '16vw', cursor: 'pointer' }}
            />
          </Flex>
        </Col>
      </Row>
    </Header>
  );
};

export default LayoutHeader;
