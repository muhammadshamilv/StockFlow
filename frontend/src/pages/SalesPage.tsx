import { useEffect, useState } from "react"
import type { Sale } from "@/types/inventory"

import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function SalesPage(){

    const [products,setProducts] = useState<any[]>([])

    const [sales,setSales] = useState<Sale[]>([])

    const [product,setProduct] = useState("")

    const [quantity,setQuantity] = useState("")

    const loadProducts = () => {
        api.get("/api/inventory/products/").then((res)=>{
            setProducts(res.data)
        })
    }

    const loadSales = () => {
        api.get("/api/inventory/sales/").then((res)=>{
            setSales(res.data)
        })
    }

    useEffect(()=>{
        loadProducts()
        loadSales()
    },[])

    const createSale = () => {
        api.post("/api/inventory/sales/",
            {
                product,
                quantity
            }
        ).then(()=>{
            setQuantity("")
            loadSales()
            loadProducts()
        }).catch((error)=>{
            alert(error.response?.data?.error || "Sale failed")
        })
    }

    return(

        <DashboardLayout>

            <div className="space-y-6">

                <Card>
                    <CardHeader>
                        <CardTitle>
                            Create Sale
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

                        <Input
                            placeholder="Quantity"
                            value={quantity}
                            onChange={(e)=>
                                setQuantity(
                                    e.target.value
                                )
                            }
                        />

                        <Button onClick={createSale}>
                            Record Sale
                        </Button>

                    </CardContent>

                </Card>

                <Card>

                    <CardHeader>
                        <CardTitle>
                            Sales History
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {
                            sales.map(
                                (sale:any)=>(
                                    <div key={sale.id} className="border-b py-3">

                                        <div>
                                            {sale.product_name}
                                        </div>

                                        <div>
                                            Qty:
                                            {sale.quantity}
                                        </div>

                                        <div>
                                            ₹{sale.total_amount}
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

export default SalesPage