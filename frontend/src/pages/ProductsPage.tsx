import api from "@/api/axios"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function ProductPage(){

    const [products, setProducts] = useState<any[]>([])

    const [name, setName] = useState("")

    const [price, setPrice] = useState("")

    const [quantity, setQuantity] = useState("")

    const loadProducts = () => {
        api.get("/api/inventory/products/").then((res) => {
            setProducts(res.data)
        })
    }

    useEffect(() => {
        loadProducts()
    }, [])

    const addProducts = () => {
        api.post("/api/inventory/products/", {
            category: 1,
            name,
            price,
            quantity
        }).then(() => {
            setName("")
            setPrice("")
            setQuantity("")
        })
    }

    return(
        <div className="p-10">

            <Card>

                <CardHeader>
                    <CardTitle>
                        Products
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                    <Input placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />

                    <Input placeholder="Product Price" value={price} onChange={(e) => setPrice(e.target.value)} />

                    <Input placeholder="Product Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

                    <Button onClick={addProducts}>
                        Add Products
                    </Button>
                    {
                        products.map((product:any) => (
                            <div key={product.id} className="border p-3 rounded">
                                <div>
                                    {product.name}
                                </div>
                                <div>
                                    ₹{product.price}
                                </div>
                                <div>
                                    Stock: {product.quantity}
                                </div>
                            </div>
                        ))
                    }
                </CardContent>
                
            </Card>
        </div>
    )

}
export default ProductPage