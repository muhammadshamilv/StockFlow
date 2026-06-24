export interface DashboardStats {
    total_products: number
    total_categories: number
    total_quantity: number
    inventory_value: number
    low_stock_count: number
    out_of_stock_count: number
    total_transactions: number
    stock_in_count: number
    stock_out_count: number
    total_sales: number
    total_revenue: number
    recent_products: any[]
    recent_transactions: any[]
    top_selling_products: any[]
}