import { BrowserRouter, Routes, Route } from "react-router-dom"

import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import DashboardPage from "@/pages/DashboardPage"
import CategoriesPage from "@/pages/CategoriesPage"
import ProductPage from "@/pages/ProductsPage"
import TransactionsPage from "@/pages/TransactionsPage"
import SalesPage from "@/pages/SalesPage"

import ProtectedRoute from "./ProtectedRoute"

function AppRoutes(){
    return(
        <BrowserRouter>

            <Routes>

                <Route path="/" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } />
                <Route path="/categories" element={
                    <ProtectedRoute>
                        <CategoriesPage />
                    </ProtectedRoute>
                } />
                <Route path="/products" element={
                    <ProtectedRoute>
                        <ProductPage />
                    </ProtectedRoute>
                } />
                <Route path="/transactions" element={
                    <ProtectedRoute>
                        <TransactionsPage />
                    </ProtectedRoute>
                } />
                <Route path="/sales" element={
                    <ProtectedRoute>
                        <SalesPage />
                    </ProtectedRoute>
                } />
            </Routes>

        </BrowserRouter>
    )
}
export default AppRoutes