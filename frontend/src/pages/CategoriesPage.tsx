import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"


function CategoriesPage(){

    const [categories, setCategories]= useState<any[]>([])

    const [name, setName] = useState("")

    const [search, setSearch] = useState("")

    const [editCategory, setEditCategory] = useState<any>(null)

    const filteredCategories = categories.filter(
        (category:any)=>
            category.name
                .toLowerCase()
                .includes(
                    search.toLowerCase()
                )
    )

    const loadCategories = () => {
        api.get("/api/inventory/categories/").then((res) => {
            setCategories(res.data)
        })
    }

    useEffect(() => {
        loadCategories()
    }, [])

    const addCategories = () => {
        api.post("/api/inventory/categories/",{
            name
        }).then(() => {
            setName("")
            loadCategories()
        })
    }

    const deleteCategory = (id:number) => {
        api.delete(`/api/inventory/categories/${id}/`).then(() => {
            loadCategories()
        })
    }
    
    const updateCategory = () => {
        api.put(`/api/inventory/categories/${editCategory.id}/`,editCategory).then(() => {
            setEditCategory(null)
            loadCategories()
        })
    }

    return(
        <DashboardLayout>
            <div className="p-10">

                <Card>

                    <CardHeader>
                        <CardTitle>
                            Categories
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">

                        <Input value={name} placeholder="Category Name" onChange={(e) => setName(e.target.value)} />

                        <Button onClick={addCategories}>
                            Add Categories
                        </Button>
                        <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        
                        <Table>
                            <TableHeader>
                                <TableRow>
                            
                                    <TableHead>
                                        Category
                                    </TableHead>
                                    <TableHead>
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {
                                filteredCategories.map(
                                    (category:any)=>(
                                        <TableRow key={category.id}>  
                                            <TableCell>
                                                {category.name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild >
                                                            <Button size="sm" onClick={() =>setEditCategory(category)}>
                                                                Edit
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>
                                                                    Edit Category
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            {
                                                                editCategory && (
                                                                    <div className="space-y-4">
                                                                        <Input
                                                                            value={
                                                                            editCategory.name
                                                                            }
                                                                            onChange={(e)=>
                                                                                setEditCategory({
                                                                                    ...editCategory,
                                                                                    name:e.target.value
                                                                                })
                                                                            }
                                                                        />
                                                                        <Button onClick={updateCategory}>
                                                                            Save
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            }
                                                    </DialogContent>
                                                </Dialog>
                    
                                                <Button variant="destructive" size="sm"onClick={() => deleteCategory(category.id)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            )
                        }
                    </TableBody>
                </Table>
                    </CardContent>

                </Card>

            </div>
        </DashboardLayout>
    )
}
export default CategoriesPage