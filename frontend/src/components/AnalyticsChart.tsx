import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts"

type Props = {
    totalProducts: number
    totalCategories: number
    totalTransactions: number
    totalSales: number
}

function AnalyticsChart({
    totalProducts,
    totalCategories,
    totalTransactions,
    totalSales
}: Props){

    const data = [
        {
            name: "Products",
            value: totalProducts
        },
        {
            name: "Categories",
            value: totalCategories
        },
        {
            name: "Transactions",
            value: totalTransactions
        },
        {
            name: "Sales",
            value: totalSales
        }
    ]

    return(
        <div className="h-[350px] w-full">

            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8,8,0,0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export default AnalyticsChart