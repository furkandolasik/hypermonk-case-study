import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';
import Home from './Console/Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Navigate to="/home" />} />
        <Route path="home" element={<Home />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
