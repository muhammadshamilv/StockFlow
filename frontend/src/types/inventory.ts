export interface Category {
    id: number
    name: string
    created_at: string
}

export interface Product {
    id: number
    category: number
    name: string
    price: string
    quantity: number
    created_at: string
}

export interface Transaction {
    id: number
    product: number
    product_name: string
    transaction_type: string
    quantity: number
    created_at: string
}

export interface Sale {
    id: number
    product: number
    product_name: string
    quantity: number
    unit_price: string
    total_amount: string
    created_at: string
}