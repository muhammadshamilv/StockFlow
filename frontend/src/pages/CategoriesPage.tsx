import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


function CategoriesPage(){

    const [categories, setCategories]= useState<any[]>([])

    const [name, setName] = useState("")

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
                        {
                            categories.map((category:any) => (
                                <div key={category.id}>
                                    {category.name}
                                </div>
                            ))
                        }
                    </CardContent>

                </Card>

            </div>
        </DashboardLayout>
    )
}
export default CategoriesPage