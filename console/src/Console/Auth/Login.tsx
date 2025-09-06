import type { FormProps } from 'antd';
import { Button, Flex, Form, Input, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ConsoleLayout from '../Layout/ConsoleLayout';

type FieldType = {
  username?: string;
  password?: string;
};

const { Text } = Typography;

const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'crypto123',
};

const Login = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loginButtonLoading, setLoginButtonLoading] = useState(false);

  const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    const { password, username } = values;

    try {
      setLoginButtonLoading(true);

      if (password && username) {
        if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('username', username);

          messageApi.open({
            type: 'success',
            content: 'Login successful!',
          });

          // Navigate to dashboard
          navigate('/dashboard');
        } else {
          throw new Error('Invalid username or password');
        }
      }
    } catch (error: any) {
      messageApi.open({
        type: 'error',
        content: error.message ?? 'Something went wrong',
      });
    }
    setLoginButtonLoading(false);
  };

  const checkSession = () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <>
      {contextHolder}
      <ConsoleLayout
        adsDisabled={true}
        content={
          <Flex style={{ width: '100%', height: '100%' }} align="center" justify="center">
            <Flex justify="center" vertical gap={8}>
              <Flex vertical>
                <Text style={{ fontWeight: 600, fontSize: 24 }}>CRYPTO DASHBOARD</Text>
                <Text>Sign in to view cryptocurrency data</Text>
              </Flex>

              <Flex>
                <Form onFinish={onFinish}>
                  <Form.Item<FieldType>
                    name="username"
                    rules={[{ required: true, message: 'Please input your username!' }]}>
                    <Input placeholder="Username (admin)" style={{ width: 400 }} />
                  </Form.Item>

                  <Form.Item<FieldType>
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}>
                    <Input.Password placeholder="Password (crypto123)" />
                  </Form.Item>

                  <Form.Item>
                    <Flex justify="center">
                      <Button
                        loading={loginButtonLoading}
                        style={{ width: 400, marginTop: 18 }}
                        type="primary"
                        htmlType="submit">
                        Login
                      </Button>
                    </Flex>
                  </Form.Item>

                  <Form.Item>
                    <Flex justify="center">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Demo credentials: admin / crypto123
                      </Text>
                    </Flex>
                  </Form.Item>
                </Form>
              </Flex>
            </Flex>
          </Flex>
        }
      />
    </>
  );
};

export default Login;
