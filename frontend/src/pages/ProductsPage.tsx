import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Target } from "lucide-react"

function ProductPage(){

    const [products, setProducts] = useState<any[]>([])

    const [categories, setCategories] = useState<any[]>([])

    const [category, setCategory] = useState("")

    const [name, setName] = useState("")

    const [price, setPrice] = useState("")

    const [quantity, setQuantity] = useState("")

    const [search, setSearch] = useState("")

    const [editProduct, setEditProduct] = useState<any>(null)

    const filteredProducts = products.filter(
        (product:any) => 
            product.name.toLowerCase().includes(search.toLowerCase())
    )

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

    const updateProduct = () => {
        api.put(`/api/inventory/products/${editProduct.id}/`, editProduct).then(() => {
            setEditProduct(null)
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

                    <Input placeholder="Search Products...." value={search} onChange={(e) => setSearch(e.target.value)} />
                    {
                        products.length === 0 && (
                            <div className="border rounded-xl p-10 text-center">
                                No Products Found..
                            </div>
                        )
                    }

                    <Table>
                        <TableHeader>
                            <TableRow>

                                <TableHead>Product</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>

                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {
                                filteredProducts.map((product:any) => (
                                    <TableRow key={product.id}>

                                        <TableCell>
                                            {product.name}
                                        </TableCell>

                                        <TableCell>
                                            {product.category_name}
                                        </TableCell>

                                        <TableCell>
                                            ₹{product.price}
                                        </TableCell>

                                        <TableCell>
                                            {product.quantity}
                                        </TableCell>

                                        <TableCell>
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
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex gap-2">

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" onClick={() => setEditProduct(product)}>
                                                            Edit
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>
                                                                Edit Product
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        {
                                                            editProduct && (
                                                                <div className="space-y-4">

                                                                    <Input value={editProduct.name} onChange={(e) => setEditProduct({...editProduct, name:e.target.value})} />

                                                                    <Input value={editProduct.price} onChange={(e) => setEditProduct({...editProduct, price:e.target.value})} />

                                                                    <Input value={editProduct.quantity} onChange={(e) => setEditProduct({...editProduct, quantity:e.target.value})} />

                                                                    <Button onClick={updateProduct}>
                                                                        Save
                                                                    </Button>

                                                                </div>
                                                            )
                                                        }
                                                    </DialogContent>
                                                </Dialog>

                                                <Button variant="destructive" size="sm" onClick={() => deleteProduct(product.id)}>
                                                    Delete
                                                </Button>
                                                
                                            </div>
                                        </TableCell>

                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>

                </CardContent>

            </Card>
        </div>
        </DashboardLayout>
    )

}
export default ProductPage