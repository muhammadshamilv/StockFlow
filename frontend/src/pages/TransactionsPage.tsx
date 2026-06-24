import { useEffect, useState } from "react"
import type{ Transaction } from "@/types/inventory"

import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function TransactionsPage(){

    const [products,setProducts] = useState<any[]>([])

    const [transactions,setTransactions] = useState<Transaction[]>([])

    const [product,setProduct] = useState("")

    const [transactionType,setTransactionType] = useState("IN")

    const [quantity,setQuantity] = useState("")

    const loadProducts = () => {
        api.get("/api/inventory/products/").then((res) => {
            setProducts(res.data)
        })
    }

    const loadTransactions = () => {
        api.get("/api/inventory/transactions/").then((res) => {
            setTransactions(res.data)
        })
    }

    useEffect(()=>{
        loadProducts()
        loadTransactions()
    }, [])

    const createTransaction = () => {
        api.post("/api/inventory/transactions/",
            {
                product,
                transaction_type: transactionType,
                quantity
            }
        ).then(()=>{
            setQuantity("")
            loadTransactions()
        })
    }

    return(

        <DashboardLayout>

            <div className="space-y-6">

                <Card>

                    <CardHeader>
                        <CardTitle>
                            Inventory Transaction
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">

                        <Select value={product} onValueChange={setProduct}>

                            <SelectTrigger>
                                <SelectValue placeholder="Select Product" />
                            </SelectTrigger>

                            <SelectContent>
                                {
                                    products.map(
                                        (product:any)=>(
                                            <SelectItem key={product.id} value={String(product.id)}>
                                                {product.name}
                                            </SelectItem>
                                        )
                                    )
                                }
                            </SelectContent>

                        </Select>

                        <Select value={transactionType} onValueChange={setTransactionType}>

                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="IN">
                                    Stock In
                                </SelectItem>

                                <SelectItem value="OUT">
                                    Stock Out
                                </SelectItem>

                            </SelectContent>

                        </Select>

                        <Input placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

                        <Button onClick={createTransaction}>
                            Save Transaction
                        </Button>

                    </CardContent>

                </Card>

                <Card>

                    <CardHeader>
                        <CardTitle>
                            Transaction History
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {
                            transactions.map(
                                (transaction:any)=>(
                                    <div key={transaction.id} className="border-b py-3">

                                        <div>
                                            {transaction.product_name}
                                        </div>

                                        <div>
                                            {transaction.transaction_type}
                                        </div>

                                        <div>
                                            Qty:
                                            {transaction.quantity}
                                        </div>

                                    </div>
                                )
                            )
                        }

                    </CardContent>

                </Card>

            </div>

        </DashboardLayout>

    )

}

export default TransactionsPage