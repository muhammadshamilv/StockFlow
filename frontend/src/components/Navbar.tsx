import { Link } from "react-router-dom"

function Navbar(){

    return(
        <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">

            <div className="h-16 px-8 flex items-center justify-between">

                <Link to="/dashboard" className="text-2xl font-bold">
                    StockFlow
                </Link>

                <div className="flex gap-6 text-sm">

                    <Link to="/dashboard">
                        Dashboard
                    </Link>

                    <Link to="/categories">
                        Categories
                    </Link>

                    <Link to="/products">
                        Products
                    </Link>

                </div>

            </div>

        </header>
    )
}

export default Navbar