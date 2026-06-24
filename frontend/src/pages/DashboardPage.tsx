import { useEffect, useState } from "react"

import api from "@/api/axios"

import DashboardLayout from "@/layouts/DashboardLayout"

import { Button } from "@/components/ui/button"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { useNavigate } from "react-router-dom"

function DashboardPage(){

    const navigate = useNavigate()

    const [stats,setStats] = useState<any>({
        total_products:0,
        total_categories:0,
        total_quantity:0,
        inventory_value:0
    })

    useEffect(()=>{
        api.get(
            "/api/inventory/dashboard/"
        )
        .then((res)=>{
            setStats(res.data)
        })
    },[])

    const logout = () => {
        localStorage.removeItem("access")
        localStorage.removeItem("refresh")
        navigate("/")
    }

    return(

        <DashboardLayout>

            <div className="space-y-8">

                <div className="flex justify-between items-center">

                    <div>

                        <h1 className="text-4xl font-bold">

                            Dashboard

                        </h1>

                        <p className="text-muted-foreground">

                            Inventory Overview

                        </p>

                    </div>

                    <Button variant="outline" onClick={logout}>
                        Logout
                    </Button>

                </div>

                <div className="grid md:grid-cols-4 gap-6">

                    <Card>

                        <CardHeader>
                            <CardTitle>
                                Categories
                            </CardTitle>
                        </CardHeader>

                        <CardContent>

                            <p className="text-4xl font-bold">
                                {stats.total_categories}
                            </p>

                        </CardContent>

                    </Card>

                    <Card>

                        <CardHeader>
                            <CardTitle>
                                Products
                            </CardTitle>
                        </CardHeader>

                        <CardContent>

                            <p className="text-4xl font-bold">
                                {stats.total_products}
                            </p>

                        </CardContent>

                    </Card>

                    <Card>

                        <CardHeader>
                            <CardTitle>
                                Inventory Units
                            </CardTitle>
                        </CardHeader>

                        <CardContent>

                            <p className="text-4xl font-bold">
                                {stats.total_quantity}
                            </p>

                        </CardContent>

                    </Card>

                    <Card>

                        <CardHeader>
                            <CardTitle>
                                Inventory Value
                            </CardTitle>

                        </CardHeader>

                        <CardContent>

                            <p className="text-3xl font-bold">
                                ₹{stats.inventory_value}
                            </p>

                        </CardContent>

                    </Card>

                </div>

            </div>

        </DashboardLayout>

    )

}

export default DashboardPage