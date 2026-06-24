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
        inventory_value:0,
        low_stock_count:0,
        out_of_stock_count:0,
        total_transactions:0,
        stock_in_count:0,
        stock_out_count:0,
        recent_products: [],
        recent_transactions:[],
        total_sales:0,
        total_revenue:0,
        top_selling_products:[],
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

                <div className="grid md-grid-cols-2 xl:grid-cols-4 gap-6">

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
                                Inventory units
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

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Low Stocks Alert
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">
                                {stats.low_stock_count}
                            </p>
                        </CardContent>
                    </Card>               

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Out of Stocks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.out_of_stock_count}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">
                                {stats.total_transactions}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Stock In
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">  
                                {stats.stock_in_count}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Stock Out
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">
                                {stats.stock_out_count}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Total Sales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">
                                {stats.total_sales}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Revenue
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                ₹{stats.total_revenue}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Recent Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {
                                stats.recent_products?.map((product:any) => (
                                    <div key={product.id} className="flex justify-between border-b py-3">
                                        <span>
                                            {product.name}
                                        </span>
                                        <span>
                                            Quantity: {product.quantity}
                                        </span>
                                    </div>
                                ))
                            }
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Recent Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                        {
                            stats.recent_transactions?.map(
                                (transaction:any,index:number) => (
                                    <div key={index} className="border-b py-3">
                                        <div>
                                            {transaction.product}
                                        </div>
                                        <div>
                                            {transaction.type}
                                        </div>
                                        <div>
                                            Quantity:
                                            {transaction.quantity}
                                        </div>
                                    </div>
                                )
                            )
                        }
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Top Selling Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                        {
                            stats.top_selling_products?.map(
                                (product:any, index:number) => (
                                    <div key={index} className="border-b py-3">
                                        <div>
                                            {product.product}
                                        </div>
                                        <div>
                                            Sold:
                                            {product.quantity}
                                        </div>
                                    </div>
                                )
                            )
                        }
                        </CardContent>
                    </Card>

                </div>

            </div>

        </DashboardLayout>

    )

}

export default DashboardPage