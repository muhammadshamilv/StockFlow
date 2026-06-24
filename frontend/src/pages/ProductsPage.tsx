import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function ProductPage(){

    const [products, setProducts] = useState<any[]>([])

    const [categories, setCategories] = useState<any[]>([])

    const [category, setCategory] = useState("")

    const [name, setName] = useState("")

    const [price, setPrice] = useState("")

    const [quantity, setQuantity] = useState("")

    const loadProducts = () => {
        api.get("/api/inventory/products/").then((res) => {
            setProducts(res.data)
        })
    }

    const loadCategories = () => {
        api.get("/api/inventory/categories/").then((res) => {
            setCategories(res.data)
        })
    }

    useEffect(() => {
        loadProducts()
        loadCategories()
    }, [])

    const addProducts = () => {
        api.post("/api/inventory/products/", {
            category: category,
            name,
            price,
            quantity
        }).then(() => {
            setName("")
            setPrice("")
            setQuantity("")
            setCategory("")
            loadProducts()
        })
    }

    const deleteProduct = (id: number) => {
        api.delete(`/api/inventory/products/${id}/`).then(() => {
            loadProducts()
        })
    }

    return(
        <DashboardLayout>
        <div className="p-10">

            <Card>

                <CardHeader>
                    <CardTitle>
                        Products
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">

                    <Input placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />

                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {
                                categories.map((cat:any) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>

                    <Input placeholder="Product Price" value={price} onChange={(e) => setPrice(e.target.value)} />

                    <Input placeholder="Product Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />

                    <Button onClick={addProducts}>
                        Add Products
                    </Button>
                    {
                        products.length === 0 && (
                            <div className="border rounded-xl p-10 text-center">
                                No Products Found..
                            </div>
                        )
                    }
                    {
                        products.map((product:any) => (
                            <div key={product.id} className="border p-3 space-y-2">
                                <div className="flex justify-between">
                                    
                                    <h3 className="font-semibold">
                                        {product.name}
                                    </h3>
                                    {
                                        product.quantity <= 5 ? 
                                        <Badge variant="destructive">
                                            Low Stock
                                        </Badge>
                                        :
                                        <Badge>
                                            In Stock
                                        </Badge>
                                    }
                                </div>

                                <p>
                                    Category : {product.category_name}
                                </p>

                                <p>
                                    price : ₹{product.price}
                                </p>

                                <p>
                                    Quantity : {product.quantity}
                                </p>

                                <p>
                                    Inventory Value : ₹{(Number(product.price) * Number(product.quantity))}
                                </p>

                                <Button variant="destructive" onClick={() => deleteProduct(product.id)}>
                                    Delete
                                </Button>

                            </div>
                        ))
                    }
                </CardContent>

            </Card>
        </div>
        </DashboardLayout>
    )

}
export default ProductPage