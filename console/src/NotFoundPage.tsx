import { Result, Button } from 'antd';
import Typography from 'antd/es/typography/Typography';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry we could not find your page."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          <Typography>Back to Home</Typography>
        </Button>
      }
    />
  );
};

export default NotFoundPage;
