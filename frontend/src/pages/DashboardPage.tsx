import { Button } from "@/components/ui/button"

import { useNavigate } from "react-router-dom"

function DashboardPage(){

    const navigate = useNavigate()

    const logout = () => {
        localStorage.removeItem("access")
        localStorage.removeItem("refresh")
        navigate("/")
    }

    return(
        <div className="min-h-screen p-10">
            <div className="flex justify-between">

                <h1 className="text-4xl font-bold">
                    StockFlow Dashboard
                </h1>

                <Button variant="outline" onClick={logout}>
                    Logout
                </Button>
                
            </div>
        </div>
    )
}
export default DashboardPage