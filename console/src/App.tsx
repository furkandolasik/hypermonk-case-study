import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';
import Home from './Console/Home';
import Login from './Console/Auth/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Home />} />
        <Route path="auth">
          <Route path="login" element={<Login />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
