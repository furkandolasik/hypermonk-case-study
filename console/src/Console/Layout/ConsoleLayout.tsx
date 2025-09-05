import { Col, ConfigProvider, Image, Layout, Row, theme } from 'antd';
import LayoutFooter from './Footer';
import LayoutHeader from './Header';
import { ReactNode } from 'react';

const { Content } = Layout;

interface ConsoleLayoutProps {
  content: ReactNode;
  adsDisabled?: boolean;
}

const ConsoleLayout = (props: ConsoleLayoutProps) => {
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
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#0c589e',
          //#021b36,#072b4d,#0b4173,#105ea6,#147ad9,#3a98e6,#64b6f2,#8dcff7,#b6e2fa
        },
      }}>
      <Layout
        style={{
          height: '100vh',
          backgroundSize: 'cover',
        }}>
        <LayoutHeader />
        <Content>
          <Col style={{ overflow: 'auto', width: '100%', height: '100%' }}>
            <Row style={{ width: '100%', height: '100%' }} justify={'space-between'} align={'middle'}>
              {props.content}
            </Row>
          </Col>
        </Content>
        <LayoutFooter />
      </Layout>
    </ConfigProvider>
  );
};

export default ConsoleLayout;
