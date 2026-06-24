import { Link } from "react-router-dom"

function Sidebar(){

    return(

        <aside className="w-64 border-r bg-card/30">

            <div className="p-6">

                <h2 className="font-semibold text-lg">

                    Management

                </h2>

            </div>

            <nav className="px-4 space-y-2">

                <Link to="/dashboard" className="block rounded-lg px-4 py-3 hover:bg-accent">
                    Dashboard
                </Link>

                <Link to="/categories" className="block rounded-lg px-4 py-3 hover:bg-accent">
                    Categories
                </Link>

                <Link to="/products" className="block rounded-lg px-4 py-3 hover:bg-accent">
                    Products
                </Link>

            </nav>

        </aside>

    )

}

export default Sidebar