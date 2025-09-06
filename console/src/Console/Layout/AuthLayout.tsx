import { Col, ConfigProvider, Layout, Row } from 'antd';
import LayoutFooter from './Footer';
import LayoutHeader from './Header';

const { Content } = Layout;

interface AuthLayoutProps {
  content: any;
}

const AuthLayout = (props: AuthLayoutProps) => {
  return (
    <ConfigProvider
      theme={{
        components: {
          Layout: {
            bodyBg: '#070b0e',
            headerBg: `#070b0e`,
            footerBg: '#141412',
          },
        },
      }}>
      <Layout
        style={{
          height: '100vh',
          backgroundSize: 'cover',
        }}>
        <LayoutHeader />
        <Content>
          <Col style={{ overflow: 'auto' }}>
            <Row justify={'space-between'} align={'middle'}>
              {props.content}
            </Row>
          </Col>
        </Content>
        <LayoutFooter />
      </Layout>
    </ConfigProvider>
  );
};

export default AuthLayout;
