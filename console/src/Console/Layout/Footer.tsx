import { Flex, Layout, Typography } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

const LayoutFooter = () => {
  return (
    <Footer>
      <Flex vertical justify="center" align="center">
        <Text
          style={{
            fontSize: 14,
          }}>{`COPYRIGHT ${new Date().getFullYear()}. All rights reserved.`}</Text>
      </Flex>
    </Footer>
  );
};

export default LayoutFooter;
