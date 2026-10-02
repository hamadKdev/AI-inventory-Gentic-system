import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import StockIn from './pages/StockIn.jsx';
import StockOut from './pages/StockOut.jsx';
import Sales from './pages/Sales.jsx';
import StockHistory from './pages/StockHistory.jsx';
import Reports from './pages/Reports.jsx';
import AIAssistant from './pages/AIAssistant.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="stock-out" element={<StockOut />} />
              <Route path="sales" element={<Sales />} />
              <Route path="stock-history" element={<StockHistory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
